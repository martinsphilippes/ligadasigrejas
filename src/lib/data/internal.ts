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
  highlights: number;
}

/**
 * Desempenho dos atletas nos jogos internos finalizados da igreja.
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

    const rows = new Map<string, InternalStatsRow>(
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
          highlights: 0,
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
        row.games++;
        if (winner && p.side === winner) row.wins++;
      }
      for (const e of match.events) {
        const row = rows.get(e.athleteId);
        if (!row) continue;
        if (e.type === "GOL") row.goals++;
        else if (e.type === "DESTAQUE") row.highlights++;
      }
    }

    return [...rows.values()];
  },
);

export type InternalSort = "destaques" | "gols" | "vitorias" | "jogos";

export function sortInternalStats(
  rows: InternalStatsRow[],
  sort: InternalSort,
): InternalStatsRow[] {
  const key: Record<InternalSort, (r: InternalStatsRow) => number> = {
    destaques: (r) => r.highlights,
    gols: (r) => r.goals,
    vitorias: (r) => r.wins,
    jogos: (r) => r.games,
  };
  const primary = key[sort];
  return [...rows].sort(
    (a, b) =>
      primary(b) - primary(a) ||
      b.highlights - a.highlights ||
      b.goals - a.goals ||
      b.wins - a.wins ||
      a.name.localeCompare(b.name),
  );
}
