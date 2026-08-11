import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export interface InternalStatsRow {
  athleteId: string;
  name: string;
  photoUrl: string | null;
  squadRole: string;
  games: number;
  wins: number;
  goals: number;
  assists: number;
  highlights: number;
  absences: number;
  /** Média das notas (null se nunca avaliado) */
  avgRating: number | null;
}

/**
 * Desempenho dos atletas nos jogos internos finalizados da igreja.
 * Faltas não contam como jogo; nota é a média das avaliações recebidas.
 * @param sinceDays limita ao período recente (undefined = tudo)
 */
export const getInternalStats = cache(
  async (churchId: string, sinceDays?: number): Promise<InternalStatsRow[]> => {
    const since = sinceDays
      ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
      : undefined;

    const [athletes, matches] = await Promise.all([
      db.athlete.findMany({
        where: { churchId, active: true },
        select: { id: true, name: true, photoUrl: true, squadRole: true },
      }),
      db.internalMatch.findMany({
        where: {
          churchId,
          status: "FINALIZADO",
          ...(since ? { scheduledAt: { gte: since } } : {}),
        },
        include: { players: true, events: true },
      }),
    ]);

    interface Acc extends InternalStatsRow {
      ratingSum: number;
      ratingCount: number;
    }
    const rows = new Map<string, Acc>(
      athletes.map((a) => [
        a.id,
        {
          athleteId: a.id,
          name: a.name,
          photoUrl: a.photoUrl,
          squadRole: a.squadRole,
          games: 0,
          wins: 0,
          goals: 0,
          assists: 0,
          highlights: 0,
          absences: 0,
          avgRating: null,
          ratingSum: 0,
          ratingCount: 0,
        },
      ]),
    );

    for (const match of matches) {
      const winner =
        match.scoreA == null || match.scoreB == null || match.scoreA === match.scoreB
          ? null
          : match.scoreA > match.scoreB
            ? "A"
            : "B";
      for (const p of match.players) {
        const row = rows.get(p.athleteId);
        if (!row) continue;
        if (!p.attended) {
          row.absences++;
          continue;
        }
        row.games++;
        if (winner && p.side === winner) row.wins++;
        if (p.rating != null) {
          row.ratingSum += p.rating;
          row.ratingCount++;
        }
      }
      for (const e of match.events) {
        const row = rows.get(e.athleteId);
        if (!row) continue;
        if (e.type === "GOL") row.goals++;
        else if (e.type === "ASSISTENCIA") row.assists++;
        else if (e.type === "DESTAQUE") row.highlights++;
      }
    }

    return [...rows.values()].map((r) => ({
      ...r,
      avgRating: r.ratingCount > 0 ? r.ratingSum / r.ratingCount : null,
    }));
  },
);

export type InternalSort =
  | "destaques"
  | "nota"
  | "gols"
  | "assistencias"
  | "vitorias"
  | "jogos";

export function sortInternalStats(
  rows: InternalStatsRow[],
  sort: InternalSort,
): InternalStatsRow[] {
  const key: Record<InternalSort, (r: InternalStatsRow) => number> = {
    destaques: (r) => r.highlights,
    nota: (r) => r.avgRating ?? -1,
    gols: (r) => r.goals,
    assistencias: (r) => r.assists,
    vitorias: (r) => r.wins,
    jogos: (r) => r.games,
  };
  const primary = key[sort];
  return [...rows].sort(
    (a, b) =>
      primary(b) - primary(a) ||
      b.highlights - a.highlights ||
      (b.avgRating ?? -1) - (a.avgRating ?? -1) ||
      b.goals - a.goals ||
      b.wins - a.wins ||
      a.name.localeCompare(b.name),
  );
}

// ─── Evolução individual ─────────────────────────────────────────────────────

export interface EvolutionPoint {
  matchId: string;
  date: Date | null;
  label: string; // "Verde 4×2 Amarelo"
  result: "V" | "E" | "D" | null;
  attended: boolean;
  rating: number | null;
  goals: number;
  assists: number;
  highlight: boolean;
}

/** Linha do tempo do atleta nos jogos internos finalizados (ordem cronológica). */
export const getAthleteEvolution = cache(
  async (athleteId: string): Promise<EvolutionPoint[]> => {
    const plays = await db.internalPlayer.findMany({
      where: { athleteId, match: { status: "FINALIZADO" } },
      include: {
        match: { include: { events: { where: { athleteId } } } },
      },
    });

    const points = plays.map((p) => {
      const m = p.match;
      const winner =
        m.scoreA == null || m.scoreB == null
          ? null
          : m.scoreA === m.scoreB
            ? "E"
            : m.scoreA > m.scoreB
              ? "A"
              : "B";
      const result: EvolutionPoint["result"] =
        winner === null ? null : winner === "E" ? "E" : winner === p.side ? "V" : "D";
      return {
        matchId: m.id,
        date: m.scheduledAt,
        label: `${m.teamAName} ${m.scoreA ?? "–"}×${m.scoreB ?? "–"} ${m.teamBName}`,
        result,
        attended: p.attended,
        rating: p.rating,
        goals: m.events.filter((e) => e.type === "GOL").length,
        assists: m.events.filter((e) => e.type === "ASSISTENCIA").length,
        highlight: m.events.some((e) => e.type === "DESTAQUE"),
      };
    });

    return points.sort(
      (a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0),
    );
  },
);
