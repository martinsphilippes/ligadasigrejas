"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getLeagueAccess, can } from "@/lib/permissions";
import { generateRoundRobin } from "@/lib/domain/fixtures";
import { MATCH_STATUS, EVENT_TYPE } from "@/lib/domain/enums";
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

// ─── Quadras ─────────────────────────────────────────────────────────────────

const venueSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da quadra"),
  address: optional(z.string().trim()),
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

/** Gera automaticamente todas as rodadas (round-robin) conforme as regras da liga. */
export async function generateFixturesAction(
  leagueId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    const { league } = await authorize(leagueId, "schedule.manage");

    const [teams, rules, existing] = await Promise.all([
      db.leagueTeam.findMany({ where: { leagueId } }),
      db.leagueRules.findUnique({ where: { leagueId } }),
      db.match.count({ where: { leagueId } }),
    ]);

    if (teams.length < 2) return { error: "Inscreva pelo menos 2 equipes antes de gerar a tabela." };
    if (existing > 0) {
      return { error: "Já existem jogos criados. Exclua os jogos atuais antes de gerar uma nova tabela." };
    }

    const rounds = generateRoundRobin(
      teams.map((t) => t.id),
      rules?.legs ?? 1,
    );

    await db.$transaction(async (tx) => {
      for (const round of rounds) {
        await tx.round.create({
          data: {
            leagueId,
            number: round.number,
            name: `Rodada ${round.number}`,
            matches: {
              create: round.matches.map((m) => ({
                leagueId,
                homeTeamId: m.homeTeamId,
                awayTeamId: m.awayTeamId,
              })),
            },
          },
        });
      }
    });

    revalidateLeague(league.slug);
    return {
      success: `Tabela gerada: ${rounds.length} rodadas e ${rounds.reduce((n, r) => n + r.matches.length, 0)} jogos.`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao gerar tabela." };
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
