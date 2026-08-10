// Geração automática de tabela (algoritmo round-robin / método do círculo).
// Lógica pura: recebe IDs de equipes e número de turnos, devolve rodadas
// com confrontos balanceados de mando.

export interface GeneratedMatch {
  homeTeamId: string;
  awayTeamId: string;
}

export interface GeneratedRound {
  number: number;
  matches: GeneratedMatch[];
}

/**
 * Gera todas as rodadas de pontos corridos.
 * @param teamIds equipes participantes (mín. 2)
 * @param legs 1 = turno único, 2 = ida e volta (mandos invertidos no returno)
 */
export function generateRoundRobin(teamIds: string[], legs = 1): GeneratedRound[] {
  if (teamIds.length < 2) return [];

  // Número ímpar de equipes: adiciona "folga" (bye) — confrontos com null são descartados.
  const teams: (string | null)[] = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(null);

  const n = teams.length;
  const roundsPerLeg = n - 1;
  const half = n / 2;
  const rotation = teams.slice(1);
  const rounds: GeneratedRound[] = [];

  for (let r = 0; r < roundsPerLeg; r++) {
    const matches: GeneratedMatch[] = [];
    const lineup = [teams[0], ...rotation];
    for (let i = 0; i < half; i++) {
      const a = lineup[i];
      const b = lineup[n - 1 - i];
      if (a == null || b == null) continue;
      // Alterna mando do pivô para balancear jogos em casa/fora.
      const swap = r % 2 === 1 && i === 0;
      matches.push(swap ? { homeTeamId: b, awayTeamId: a } : { homeTeamId: a, awayTeamId: b });
    }
    rounds.push({ number: r + 1, matches });
    rotation.unshift(rotation.pop()!);
  }

  if (legs >= 2) {
    const returnRounds: GeneratedRound[] = rounds.map((round, i) => ({
      number: roundsPerLeg + i + 1,
      matches: round.matches.map((m) => ({
        homeTeamId: m.awayTeamId,
        awayTeamId: m.homeTeamId,
      })),
    }));
    rounds.push(...returnRounds);
  }

  return rounds;
}
