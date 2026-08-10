import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { computeStandings, type TeamRow } from "@/lib/domain/standings";
import { toStandingsRules } from "@/lib/domain/rules";
import { COUNTED_STATUSES } from "@/lib/domain/enums";

export interface StandingsEntry extends TeamRow {
  churchId: string;
  churchName: string;
  crestUrl: string | null;
  group: string | null;
}

/** Classificação da liga calculada a partir das partidas contabilizáveis. */
export const getStandings = cache(async (leagueId: string): Promise<StandingsEntry[]> => {
  const [teams, matches, rules] = await Promise.all([
    db.leagueTeam.findMany({
      where: { leagueId },
      include: { church: { select: { id: true, name: true, crestUrl: true } } },
    }),
    db.match.findMany({
      where: { leagueId, status: { in: [...COUNTED_STATUSES] } },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        status: true,
        woWinnerId: true,
      },
    }),
    db.leagueRules.findUnique({ where: { leagueId } }),
  ]);

  const rows = computeStandings(
    teams.map((t) => t.id),
    matches,
    toStandingsRules(rules),
  );

  const byId = new Map(teams.map((t) => [t.id, t]));
  return rows.map((row) => {
    const team = byId.get(row.teamId)!;
    return {
      ...row,
      churchId: team.church.id,
      churchName: team.church.name,
      crestUrl: team.church.crestUrl,
      group: team.group,
    };
  });
});

/**
 * Classificação separada por grupo (fase de grupos). Cada grupo é ranqueado
 * de forma independente; equipes sem grupo entram em "Geral".
 */
export const getStandingsByGroup = cache(
  async (leagueId: string): Promise<Map<string, StandingsEntry[]>> => {
    const [teams, matches, rules] = await Promise.all([
      db.leagueTeam.findMany({
        where: { leagueId },
        include: { church: { select: { id: true, name: true, crestUrl: true } } },
      }),
      db.match.findMany({
        where: { leagueId, status: { in: [...COUNTED_STATUSES] } },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
          status: true,
          woWinnerId: true,
        },
      }),
      db.leagueRules.findUnique({ where: { leagueId } }),
    ]);

    const standingsRules = toStandingsRules(rules);
    const groups = new Map<string, typeof teams>();
    for (const team of teams) {
      const key = team.group ?? "Geral";
      groups.set(key, [...(groups.get(key) ?? []), team]);
    }

    const result = new Map<string, StandingsEntry[]>();
    for (const [group, groupTeams] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      // computeStandings ignora partidas cujas equipes não estão na lista,
      // então confrontos entre grupos diferentes não contaminam a tabela.
      const rows = computeStandings(
        groupTeams.map((t) => t.id),
        matches,
        standingsRules,
      );
      const byId = new Map(groupTeams.map((t) => [t.id, t]));
      result.set(
        group,
        rows.map((row) => {
          const team = byId.get(row.teamId)!;
          return {
            ...row,
            churchId: team.church.id,
            churchName: team.church.name,
            crestUrl: team.church.crestUrl,
            group: team.group,
          };
        }),
      );
    }
    return result;
  },
);

/** Campanha de uma equipe específica (linha da classificação + posição). */
export async function getTeamCampaign(leagueId: string, teamId: string) {
  const standings = await getStandings(leagueId);
  return standings.find((row) => row.teamId === teamId) ?? null;
}

/** Artilharia e cartões da liga (base de estatísticas individuais). */
export const getLeagueTopScorers = cache(async (leagueId: string, limit = 10) => {
  const goals = await db.matchEvent.groupBy({
    by: ["athleteId"],
    where: {
      type: "GOL",
      athleteId: { not: null },
      match: { leagueId, status: { in: [...COUNTED_STATUSES] } },
    },
    _count: { _all: true },
    orderBy: { _count: { athleteId: "desc" } },
    take: limit,
  });

  const athleteIds = goals.flatMap((g) => (g.athleteId ? [g.athleteId] : []));
  const athletes = await db.athlete.findMany({
    where: { id: { in: athleteIds } },
    include: { church: { select: { name: true, crestUrl: true } } },
  });
  const byId = new Map(athletes.map((a) => [a.id, a]));

  return goals.flatMap((g) => {
    const athlete = g.athleteId ? byId.get(g.athleteId) : null;
    if (!athlete) return [];
    return [{ athlete, goals: g._count._all }];
  });
});
