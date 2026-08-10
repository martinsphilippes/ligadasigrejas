// Regras da liga: parsing e validação do formato configurável.

import { z } from "zod";
import { TIEBREAKER, type Tiebreaker } from "./enums";
import type { StandingsRules } from "./standings";

export const DEFAULT_TIEBREAKERS: Tiebreaker[] = [
  "PONTOS",
  "VITORIAS",
  "SALDO",
  "GOLS_PRO",
  "CONFRONTO_DIRETO",
  "SORTEIO",
];

const tiebreakerSchema = z.enum(
  Object.keys(TIEBREAKER) as [Tiebreaker, ...Tiebreaker[]],
);

/** Faz o parse seguro da coluna JSON de critérios de desempate. */
export function parseTiebreakers(json: string | null | undefined): Tiebreaker[] {
  if (!json) return DEFAULT_TIEBREAKERS;
  try {
    const parsed = z.array(tiebreakerSchema).parse(JSON.parse(json));
    return parsed.length > 0 ? parsed : DEFAULT_TIEBREAKERS;
  } catch {
    return DEFAULT_TIEBREAKERS;
  }
}

export interface LeagueRulesRecord {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakers: string;
}

/** Converte o registro do banco nas regras usadas pelo motor de classificação. */
export function toStandingsRules(rules: LeagueRulesRecord | null): StandingsRules {
  if (!rules) {
    return { pointsWin: 3, pointsDraw: 1, pointsLoss: 0, tiebreakers: DEFAULT_TIEBREAKERS };
  }
  return {
    pointsWin: rules.pointsWin,
    pointsDraw: rules.pointsDraw,
    pointsLoss: rules.pointsLoss,
    tiebreakers: parseTiebreakers(rules.tiebreakers),
  };
}
