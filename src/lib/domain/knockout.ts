// Mata-mata — lógica pura de chaveamento e definição de vencedores.
// Suporta jogo único ou ida e volta, com desempate por pênaltis e W.O.

import type { RoundPhase } from "./enums";

/** Fase do mata-mata pelo número de equipes participantes. */
export function phaseForCount(count: number): RoundPhase | null {
  switch (count) {
    case 2:
      return "FINAL";
    case 4:
      return "SEMIFINAL";
    case 8:
      return "QUARTAS";
    case 16:
      return "OITAVAS";
    default:
      return null;
  }
}

export const VALID_BRACKET_SIZES = [2, 4, 8, 16];

/**
 * Posições de chave no formato padrão de bracket, para que os vencedores de
 * confrontos consecutivos se enfrentem na fase seguinte preservando as
 * cabeças de chave (ex.: n=8 → (1,8), (4,5), (2,7), (3,6)).
 */
function bracketPositions(n: number): number[] {
  let positions = [1, 2];
  while (positions.length < n) {
    const size = positions.length * 2;
    const next: number[] = [];
    for (const p of positions) next.push(p, size + 1 - p);
    positions = next;
  }
  return positions;
}

/**
 * Chaveamento por cabeças de chave em ordem de bracket. O melhor colocado
 * de cada confronto joga como mandante (e decide em casa na ida e volta).
 */
export function pairSeeds(seededTeamIds: string[]): [string, string][] {
  const order = bracketPositions(seededTeamIds.length);
  const pairs: [string, string][] = [];
  for (let i = 0; i < order.length; i += 2) {
    const a = seededTeamIds[order[i] - 1];
    const b = seededTeamIds[order[i + 1] - 1];
    // Mantém o melhor seed como mandante
    pairs.push(order[i] < order[i + 1] ? [a, b] : [b, a]);
  }
  return pairs;
}

/**
 * Intercala classificados de vários grupos para que equipes do mesmo grupo
 * só se cruzem nas fases finais: [A1, B1, ..., A2, B2, ...].
 * `qualifiedByGroup` deve vir ordenado por posição dentro de cada grupo.
 */
export function interleaveGroups(qualifiedByGroup: string[][]): string[] {
  const seeds: string[] = [];
  const maxLen = Math.max(...qualifiedByGroup.map((g) => g.length), 0);
  for (let pos = 0; pos < maxLen; pos++) {
    for (const group of qualifiedByGroup) {
      if (group[pos]) seeds.push(group[pos]);
    }
  }
  return seeds;
}

export interface KnockoutMatch {
  homeTeamId: string;
  awayTeamId: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  woWinnerId: string | null;
}

export type TieResult =
  | { winner: string; reason?: undefined }
  | { winner: null; reason: "PENDENTE" | "EMPATE_SEM_PENALTIS" };

/**
 * Vencedor de um confronto de mata-mata dadas as partidas do confronto
 * (1 no jogo único, 2 na ida e volta). Critérios: W.O. > placar agregado >
 * pênaltis da última partida.
 */
export function resolveTieWinner(
  pair: [string, string],
  matches: KnockoutMatch[],
): TieResult {
  const [teamA, teamB] = pair;
  const tieMatches = matches.filter(
    (m) =>
      (m.homeTeamId === teamA && m.awayTeamId === teamB) ||
      (m.homeTeamId === teamB && m.awayTeamId === teamA),
  );
  if (tieMatches.length === 0) return { winner: null, reason: "PENDENTE" };

  let goalsA = 0;
  let goalsB = 0;
  for (const m of tieMatches) {
    if (m.status === "WO") return m.woWinnerId ? { winner: m.woWinnerId } : { winner: null, reason: "PENDENTE" };
    if (m.status !== "FINALIZADO") return { winner: null, reason: "PENDENTE" };
    if (m.homeScore == null || m.awayScore == null) return { winner: null, reason: "PENDENTE" };
    if (m.homeTeamId === teamA) {
      goalsA += m.homeScore;
      goalsB += m.awayScore;
    } else {
      goalsB += m.homeScore;
      goalsA += m.awayScore;
    }
  }

  if (goalsA !== goalsB) return { winner: goalsA > goalsB ? teamA : teamB };

  // Agregado empatado: pênaltis da última partida do confronto
  const last = tieMatches[tieMatches.length - 1];
  if (last.homePenalties == null || last.awayPenalties == null || last.homePenalties === last.awayPenalties) {
    return { winner: null, reason: "EMPATE_SEM_PENALTIS" };
  }
  const homeWon = last.homePenalties > last.awayPenalties;
  return { winner: homeWon ? last.homeTeamId : last.awayTeamId };
}
