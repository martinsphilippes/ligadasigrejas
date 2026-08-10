import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { COUNTED_STATUSES } from "@/lib/domain/enums";

export interface SuspensionInfo {
  athleteId: string;
  athleteName: string;
  photoUrl: string | null;
  reason: string;
}

export interface TeamDiscipline {
  /** Suspensos para o próximo jogo (indicativo, conforme regras da liga). */
  suspended: SuspensionInfo[];
  /** Pendurados: a um amarelo da suspensão. */
  hanging: SuspensionInfo[];
}

/**
 * Situação disciplinar da equipe com base nos cartões registrados e nas
 * regras da liga (amarelos acumulados e suspensão por vermelho). O vermelho
 * suspende a partir da última partida disputada; amarelos suspendem quando o
 * acúmulo atinge um múltiplo do limite na partida mais recente.
 */
export const getTeamDiscipline = cache(
  async (leagueId: string, teamId: string): Promise<TeamDiscipline> => {
    const [rules, lastMatch] = await Promise.all([
      db.leagueRules.findUnique({ where: { leagueId } }),
      db.match.findFirst({
        where: {
          leagueId,
          status: { in: [...COUNTED_STATUSES] },
          OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        },
        orderBy: { scheduledAt: "desc" },
        select: { id: true },
      }),
    ]);

    const yellowLimit = rules?.yellowLimit ?? 3;
    const redSuspension = rules?.redSuspension ?? 1;

    const cards = await db.matchEvent.findMany({
      where: {
        teamId,
        athleteId: { not: null },
        type: { in: ["CARTAO_AMARELO", "CARTAO_VERMELHO"] },
        match: { leagueId, status: { in: [...COUNTED_STATUSES] } },
      },
      include: { athlete: { select: { id: true, name: true, photoUrl: true } } },
    });

    interface Tally {
      athlete: { id: string; name: string; photoUrl: string | null };
      yellows: number;
      yellowInLast: boolean;
      redInLast: boolean;
    }
    const byAthlete = new Map<string, Tally>();
    for (const card of cards) {
      if (!card.athlete) continue;
      const tally =
        byAthlete.get(card.athlete.id) ??
        ({ athlete: card.athlete, yellows: 0, yellowInLast: false, redInLast: false } as Tally);
      const inLast = card.matchId === lastMatch?.id;
      if (card.type === "CARTAO_AMARELO") {
        tally.yellows++;
        if (inLast) tally.yellowInLast = true;
      } else if (inLast) {
        tally.redInLast = true;
      }
      byAthlete.set(card.athlete.id, tally);
    }

    const suspended: SuspensionInfo[] = [];
    const hanging: SuspensionInfo[] = [];
    for (const { athlete, yellows, yellowInLast, redInLast } of byAthlete.values()) {
      if (redInLast && redSuspension > 0) {
        suspended.push({
          athleteId: athlete.id,
          athleteName: athlete.name,
          photoUrl: athlete.photoUrl,
          reason: `Cartão vermelho (${redSuspension} jogo${redSuspension > 1 ? "s" : ""})`,
        });
        continue;
      }
      if (yellows > 0 && yellows % yellowLimit === 0 && yellowInLast) {
        suspended.push({
          athleteId: athlete.id,
          athleteName: athlete.name,
          photoUrl: athlete.photoUrl,
          reason: `${yellows}º cartão amarelo`,
        });
        continue;
      }
      if (yellows % yellowLimit === yellowLimit - 1) {
        hanging.push({
          athleteId: athlete.id,
          athleteName: athlete.name,
          photoUrl: athlete.photoUrl,
          reason: `${yellows} amarelo${yellows > 1 ? "s" : ""} — a 1 da suspensão`,
        });
      }
    }

    return { suspended, hanging };
  },
);
