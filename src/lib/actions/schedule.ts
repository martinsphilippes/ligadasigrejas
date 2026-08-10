"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getLeagueAccess, can } from "@/lib/permissions";
import { generateRoundRobin } from "@/lib/domain/fixtures";
import {
  pairSeeds,
  phaseForCount,
  interleaveGroups,
  resolveTieWinner,
  VALID_BRACKET_SIZES,
} from "@/lib/domain/knockout";
import { getStandings, getStandingsByGroup } from "@/lib/data/standings";
import { MATCH_STATUS, EVENT_TYPE, ROUND_PHASE } from "@/lib/domain/enums";
import type { ActionState } from "./league";

const optional = (schema: z.ZodString) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());

async function authorize(leagueId: string, capability: Parameters<typeof can>[1]) {
  const user = await requireUser();
  const access = await getLeagueAccess(leagueId, user.sub);
  if (!can(access, capability)) throw new Error("Sem permissão.");
  const league = await db.league.findUniqueOrThrow({ where: { id: leagueId } });
  return { user, access, league };
}

function revalidateLeague(slug: string) {
  revalidatePath(`/ligas/${slug}`, "layout");
}

// ─── Equipes da liga ─────────────────────────────────────────────────────────

export async function enrollChurchAction(
  leagueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { league } = await authorize(leagueId, "teams.manage");
    const churchId = z.string().min(1, "Selecione uma igreja").parse(formData.get("churchId"));

    const exists = await db.leagueTeam.findUnique({
      where: { leagueId_churchId: { leagueId, churchId } },
    });
    if (exists) return { error: "Esta igreja já está inscrita na liga." };

    await db.leagueTeam.create({ data: { leagueId, churchId } });
    revalidateLeague(league.slug);
    return { success: "Equipe inscrita na liga." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao inscrever equipe." };
  }
}

export async function removeTeamAction(leagueId: string, teamId: string) {
  const { league } = await authorize(leagueId, "teams.manage");
  await db.leagueTeam.deleteMany({ where: { id: teamId, leagueId } });
  revalidateLeague(league.slug);
}

/** Define o grupo da equipe na fase de grupos (vazio = sem grupo). */
export async function setTeamGroupAction(
  leagueId: string,
  teamId: string,
  formData: FormData,
) {
  const { league } = await authorize(leagueId, "teams.manage");
  const raw = formData.get("group");
  const group =
    typeof raw === "string" && raw.trim() !== ""
      ? raw.trim().toUpperCase().slice(0, 2)
      : null;
  await db.leagueTeam.updateMany({ where: { id: teamId, leagueId }, data: { group } });
  revalidateLeague(league.slug);
}

// ─── Quadras ─────────────────────────────────────────────────────────────────

const venueSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da quadra"),
  address: optional(z.string().trim()),
  district: optional(z.string().trim()),
  zipCode: optional(z.string().trim().regex(/^\d{5}-?\d{3}$/, "CEP inválido (use 00000-000)")),
  city: optional(z.string().trim()),
  state: optional(z.string().trim().max(2, "Use a sigla (ex.: SP)")),
  mapUrl: optional(z.string().trim().url("Link de localização inválido")),
  photoUrl: optional(z.string().trim().url("URL da foto inválida")),
  description: optional(z.string().trim()),
});

export async function createVenueAction(
  leagueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { league } = await authorize(leagueId, "schedule.manage");
    const parsed = venueSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    await db.venue.create({
      data: { leagueId, ...parsed.data, state: parsed.data.state?.toUpperCase() },
    });
    revalidateLeague(league.slug);
    return { success: "Quadra cadastrada." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao cadastrar quadra." };
  }
}

export async function updateVenueAction(
  leagueId: string,
  venueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { league } = await authorize(leagueId, "schedule.manage");
    const parsed = venueSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const d = parsed.data;

    await db.venue.update({
      where: { id: venueId },
      data: {
        name: d.name,
        address: d.address ?? null,
        district: d.district ?? null,
        zipCode: d.zipCode ?? null,
        city: d.city ?? null,
        state: d.state?.toUpperCase() ?? null,
        mapUrl: d.mapUrl ?? null,
        photoUrl: d.photoUrl ?? null,
        description: d.description ?? null,
      },
    });
    revalidateLeague(league.slug);
    return { success: "Quadra atualizada." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao atualizar quadra." };
  }
}

export async function deleteVenueAction(leagueId: string, venueId: string) {
  const { league } = await authorize(leagueId, "schedule.manage");
  await db.venue.deleteMany({ where: { id: venueId, leagueId } });
  revalidateLeague(league.slug);
}

// ─── Geração de tabela e rodadas ─────────────────────────────────────────────

/**
 * Gera automaticamente a tabela conforme o formato configurado nas Regras:
 * pontos corridos (round-robin geral), fase de grupos (round-robin por grupo)
 * ou mata-mata (primeira fase do chaveamento com todas as equipes).
 */
export async function generateFixturesAction(
  leagueId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    const { league } = await authorize(leagueId, "schedule.manage");

    const [teams, rules, existing] = await Promise.all([
      db.leagueTeam.findMany({ where: { leagueId }, orderBy: { createdAt: "asc" } }),
      db.leagueRules.findUnique({ where: { leagueId } }),
      db.match.count({ where: { leagueId } }),
    ]);

    if (teams.length < 2) return { error: "Inscreva pelo menos 2 equipes antes de gerar a tabela." };
    if (existing > 0) {
      return { error: "Já existem jogos criados. Exclua os jogos atuais antes de gerar uma nova tabela." };
    }

    const format = rules?.format ?? "PONTOS_CORRIDOS";

    if (format === "MATA_MATA") {
      // Chaveamento direto: seeds pela ordem de inscrição.
      return createKnockoutPhase(
        leagueId,
        league.slug,
        pairSeeds(teams.map((t) => t.id)),
        rules?.playoffLegs ?? 1,
        1,
      );
    }

    const usesGroups = format === "GRUPOS" || format === "GRUPOS_MATA_MATA";
    const groups = new Map<string, string[]>();
    if (usesGroups) {
      for (const team of teams) {
        if (!team.group) {
          return {
            error:
              "O formato usa fase de grupos: defina o grupo de cada equipe na tela Equipes antes de gerar a tabela.",
          };
        }
        groups.set(team.group, [...(groups.get(team.group) ?? []), team.id]);
      }
      if (groups.size < 2) {
        return { error: "Distribua as equipes em pelo menos 2 grupos diferentes." };
      }
      for (const [g, ids] of groups) {
        if (ids.length < 2) return { error: `O grupo ${g} precisa de pelo menos 2 equipes.` };
      }
    }

    const legs = rules?.legs ?? 1;
    // Round-robin geral, ou por grupo com rodadas de mesmo número mescladas.
    const mergedRounds = new Map<number, { homeTeamId: string; awayTeamId: string }[]>();
    const pools = usesGroups ? [...groups.values()] : [teams.map((t) => t.id)];
    for (const pool of pools) {
      for (const round of generateRoundRobin(pool, legs)) {
        mergedRounds.set(round.number, [
          ...(mergedRounds.get(round.number) ?? []),
          ...round.matches,
        ]);
      }
    }

    const phase = usesGroups ? "GRUPOS" : "PONTOS_CORRIDOS";
    await db.$transaction(async (tx) => {
      for (const [number, matches] of [...mergedRounds.entries()].sort(([a], [b]) => a - b)) {
        await tx.round.create({
          data: {
            leagueId,
            number,
            name: `Rodada ${number}`,
            phase,
            matches: {
              create: matches.map((m) => ({
                leagueId,
                homeTeamId: m.homeTeamId,
                awayTeamId: m.awayTeamId,
              })),
            },
          },
        });
      }
    });

    const totalMatches = [...mergedRounds.values()].reduce((n, ms) => n + ms.length, 0);
    revalidateLeague(league.slug);
    return { success: `Tabela gerada: ${mergedRounds.size} rodadas e ${totalMatches} jogos.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao gerar tabela." };
  }
}

/** Cria os jogos de uma fase de mata-mata (ida e volta opcional) a partir dos confrontos. */
async function createKnockoutPhase(
  leagueId: string,
  slug: string,
  pairs: [string, string][],
  playoffLegs: number,
  startRoundNumber: number,
): Promise<ActionState> {
  const phase = phaseForCount(pairs.length * 2);
  if (!phase) {
    return {
      error: `Mata-mata exige ${VALID_BRACKET_SIZES.join(", ")} equipes — há ${pairs.length * 2} classificadas.`,
    };
  }

  const phaseName = ROUND_PHASE[phase];

  await db.$transaction(async (tx) => {
    const ida = await tx.round.create({
      data: {
        leagueId,
        number: startRoundNumber,
        name: playoffLegs === 2 ? `${phaseName} — Ida` : phaseName,
        phase,
      },
    });
    for (const [seedHigh, seedLow] of pairs) {
      // Ida: melhor seed fora de casa (decide em casa na volta); jogo único: melhor seed em casa.
      await tx.match.create({
        data: {
          leagueId,
          roundId: ida.id,
          homeTeamId: playoffLegs === 2 ? seedLow : seedHigh,
          awayTeamId: playoffLegs === 2 ? seedHigh : seedLow,
        },
      });
    }
    if (playoffLegs === 2) {
      const volta = await tx.round.create({
        data: {
          leagueId,
          number: startRoundNumber + 1,
          name: `${phaseName} — Volta`,
          phase,
        },
      });
      for (const [seedHigh, seedLow] of pairs) {
        await tx.match.create({
          data: {
            leagueId,
            roundId: volta.id,
            homeTeamId: seedHigh,
            awayTeamId: seedLow,
          },
        });
      }
    }
  });

  revalidateLeague(slug);
  return {
    success: `${phaseName} gerada com ${pairs.length} confronto(s)${playoffLegs === 2 ? " (ida e volta)" : ""}. Defina datas e quadras na Agenda.`,
  };
}

const KNOCKOUT_PHASES = ["OITAVAS", "QUARTAS", "SEMIFINAL", "FINAL"];

/**
 * Gera a fase final (a partir da classificação) ou a próxima fase do
 * mata-mata (a partir dos vencedores da fase anterior).
 */
export async function generatePlayoffsAction(
  leagueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { league } = await authorize(leagueId, "schedule.manage");
    const rules = await db.leagueRules.findUnique({ where: { leagueId } });
    const playoffLegs = rules?.playoffLegs ?? 1;

    const knockoutRounds = await db.round.findMany({
      where: { leagueId, phase: { in: KNOCKOUT_PHASES } },
      include: { matches: { orderBy: { createdAt: "asc" } } },
      orderBy: { number: "asc" },
    });
    const lastRoundNumber = await db.round
      .aggregate({ where: { leagueId }, _max: { number: true } })
      .then((r) => r._max.number ?? 0);

    if (knockoutRounds.length === 0) {
      // Primeira fase: classifica pela tabela (por grupo, se houver).
      const qualifiedCount = Number(formData.get("qualifiedCount") ?? 4);
      if (!VALID_BRACKET_SIZES.includes(qualifiedCount)) {
        return { error: "Quantidade de classificados inválida (2, 4, 8 ou 16)." };
      }

      const byGroup = await getStandingsByGroup(leagueId);
      let seeds: string[];
      if (byGroup.size > 1) {
        const perGroup = qualifiedCount / byGroup.size;
        if (!Number.isInteger(perGroup) || perGroup < 1) {
          return {
            error: `${qualifiedCount} classificados não dividem igualmente entre ${byGroup.size} grupos.`,
          };
        }
        seeds = interleaveGroups(
          [...byGroup.values()].map((rows) => rows.slice(0, perGroup).map((r) => r.teamId)),
        );
      } else {
        const standings = await getStandings(leagueId);
        if (standings.length < qualifiedCount) {
          return { error: "Há menos equipes na liga do que classificados solicitados." };
        }
        seeds = standings.slice(0, qualifiedCount).map((r) => r.teamId);
      }

      return createKnockoutPhase(
        leagueId,
        league.slug,
        pairSeeds(seeds),
        playoffLegs,
        lastRoundNumber + 1,
      );
    }

    // Próxima fase: vencedores da fase mais recente.
    const lastPhase = knockoutRounds[knockoutRounds.length - 1].phase;
    const phaseRounds = knockoutRounds.filter((r) => r.phase === lastPhase);
    const phaseMatches = phaseRounds.flatMap((r) => r.matches);

    if (lastPhase === "FINAL") {
      const finalPair = [phaseMatches[0].homeTeamId, phaseMatches[0].awayTeamId] as [string, string];
      const result = resolveTieWinner(finalPair, phaseMatches);
      if (!result.winner) return { error: "A final ainda não foi decidida." };
      const champion = await db.leagueTeam.findUnique({
        where: { id: result.winner },
        include: { church: true },
      });
      return { success: `🏆 Campeonato decidido: ${champion?.church.name ?? "campeão definido"}!` };
    }

    // Confrontos na ordem de criação da rodada de ida.
    const idaMatches = phaseRounds[0].matches;
    const winners: string[] = [];
    for (const m of idaMatches) {
      const pair = [m.homeTeamId, m.awayTeamId] as [string, string];
      const result = resolveTieWinner(pair, phaseMatches);
      if (!result.winner) {
        return {
          error:
            result.reason === "EMPATE_SEM_PENALTIS"
              ? "Há confronto empatado sem pênaltis registrados. Registre a disputa de pênaltis na última partida do confronto."
              : "Finalize todas as partidas da fase atual antes de gerar a próxima.",
        };
      }
      winners.push(result.winner);
    }

    // Vencedores pareiam em sequência (a ordem da ida já veio do bracket).
    const nextPairs: [string, string][] = [];
    for (let i = 0; i < winners.length; i += 2) {
      nextPairs.push([winners[i], winners[i + 1]]);
    }
    return createKnockoutPhase(leagueId, league.slug, nextPairs, playoffLegs, lastRoundNumber + 1);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao gerar fase final." };
  }
}

/** Remove todas as rodadas e jogos (para regenerar a tabela). */
export async function clearFixturesAction(leagueId: string) {
  const { league } = await authorize(leagueId, "schedule.manage");
  await db.$transaction([
    db.match.deleteMany({ where: { leagueId } }),
    db.round.deleteMany({ where: { leagueId } }),
  ]);
  revalidateLeague(league.slug);
}

// ─── Jogos ───────────────────────────────────────────────────────────────────

const matchSchema = z.object({
  homeTeamId: z.string().min(1, "Selecione o mandante"),
  awayTeamId: z.string().min(1, "Selecione o visitante"),
  roundId: optional(z.string()),
  venueId: optional(z.string()),
  scheduledAt: optional(z.string()),
});

function parseDateTime(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function createMatchAction(
  leagueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { league } = await authorize(leagueId, "schedule.manage");
    const parsed = matchSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const d = parsed.data;

    if (d.homeTeamId === d.awayTeamId) {
      return { error: "Mandante e visitante devem ser equipes diferentes." };
    }

    await db.match.create({
      data: {
        leagueId,
        homeTeamId: d.homeTeamId,
        awayTeamId: d.awayTeamId,
        roundId: d.roundId,
        venueId: d.venueId,
        scheduledAt: parseDateTime(d.scheduledAt),
      },
    });
    revalidateLeague(league.slug);
    return { success: "Jogo criado." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar jogo." };
  }
}

/** Reagendamento: data, horário, quadra e rodada. */
export async function rescheduleMatchAction(
  leagueId: string,
  matchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { league } = await authorize(leagueId, "schedule.manage");
    const schema = z.object({
      scheduledAt: optional(z.string()),
      venueId: optional(z.string()),
      roundId: optional(z.string()),
    });
    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    await db.match.update({
      where: { id: matchId },
      data: {
        scheduledAt: parseDateTime(parsed.data.scheduledAt),
        venueId: parsed.data.venueId ?? null,
        roundId: parsed.data.roundId ?? null,
      },
    });
    revalidateLeague(league.slug);
    return { success: "Jogo reagendado." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao reagendar." };
  }
}

const resultSchema = z.object({
  status: z.enum(Object.keys(MATCH_STATUS) as [string, ...string[]]),
  homeScore: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(0).optional(),
  ),
  awayScore: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(0).optional(),
  ),
  homePenalties: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(0).optional(),
  ),
  awayPenalties: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(0).optional(),
  ),
  woWinnerId: optional(z.string()),
  notes: optional(z.string().trim()),
});

/** Registro de resultado: placar, W.O., adiamento, cancelamento e observações. */
export async function recordResultAction(
  leagueId: string,
  matchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { league } = await authorize(leagueId, "results.record");
    const parsed = resultSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const d = parsed.data;

    if (d.status === "FINALIZADO" && (d.homeScore == null || d.awayScore == null)) {
      return { error: "Informe o placar completo para finalizar a partida." };
    }
    if (d.status === "WO" && !d.woWinnerId) {
      return { error: "Selecione a equipe vencedora do W.O." };
    }

    await db.match.update({
      where: { id: matchId },
      data: {
        status: d.status,
        homeScore: d.homeScore ?? null,
        awayScore: d.awayScore ?? null,
        homePenalties: d.homePenalties ?? null,
        awayPenalties: d.awayPenalties ?? null,
        woWinnerId: d.status === "WO" ? d.woWinnerId : null,
        notes: d.notes ?? null,
      },
    });
    revalidateLeague(league.slug);
    return { success: "Resultado registrado." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao registrar resultado." };
  }
}

export async function deleteMatchAction(leagueId: string, matchId: string) {
  const { league } = await authorize(leagueId, "schedule.manage");
  await db.match.deleteMany({ where: { id: matchId, leagueId } });
  revalidateLeague(league.slug);
  redirect(`/ligas/${league.slug}/jogos`);
}

// ─── Eventos da partida (gols e cartões) ─────────────────────────────────────

const eventSchema = z.object({
  teamId: z.string().min(1, "Selecione a equipe"),
  athleteId: optional(z.string()),
  type: z.enum(Object.keys(EVENT_TYPE) as [string, ...string[]]),
  minute: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(0).max(200).optional(),
  ),
  notes: optional(z.string().trim()),
});

export async function addMatchEventAction(
  leagueId: string,
  matchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { league } = await authorize(leagueId, "results.record");
    const parsed = eventSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    await db.matchEvent.create({
      data: {
        matchId,
        teamId: parsed.data.teamId,
        athleteId: parsed.data.athleteId,
        type: parsed.data.type,
        minute: parsed.data.minute,
        notes: parsed.data.notes,
      },
    });
    revalidateLeague(league.slug);
    return { success: "Evento registrado." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao registrar evento." };
  }
}

export async function deleteMatchEventAction(leagueId: string, eventId: string) {
  const { league } = await authorize(leagueId, "results.record");
  await db.matchEvent.deleteMany({ where: { id: eventId } });
  revalidateLeague(league.slug);
}
