// Motor de classificação — lógica pura, sem dependência de banco ou UI.
// Recebe partidas contabilizáveis + regras da liga e devolve a tabela ordenada
// pelos critérios de desempate configurados.

import { COUNTED_STATUSES, type MatchStatus, type Tiebreaker } from "./enums";

export interface StandingsMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  woWinnerId: string | null;
}

export interface StandingsRules {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tiebreakers: Tiebreaker[];
  /** Placar atribuído ao vencedor em caso de W.O. (padrão futsal: 3x0) */
  woScore?: [number, number];
}

export interface TeamRow {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  /** Aproveitamento em % (0–100) */
  efficiency: number;
  /** Últimos 5 resultados, mais recente por último: V, E ou D */
  form: ("V" | "E" | "D")[];
  position: number;
}

const WO_SCORE: [number, number] = [3, 0];

function emptyRow(teamId: string): TeamRow {
  return {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
    efficiency: 0,
    form: [],
    position: 0,
  };
}

/** Resolve o placar efetivo de uma partida contabilizável (trata W.O.). */
export function effectiveScore(m: StandingsMatch): [number, number] | null {
  if (!COUNTED_STATUSES.includes(m.status as MatchStatus)) return null;
  if (m.status === "WO") {
    if (!m.woWinnerId) return null;
    const [w, l] = WO_SCORE;
    return m.woWinnerId === m.homeTeamId ? [w, l] : [l, w];
  }
  if (m.homeScore == null || m.awayScore == null) return null;
  return [m.homeScore, m.awayScore];
}

export function computeStandings(
  teamIds: string[],
  matches: StandingsMatch[],
  rules: StandingsRules,
): TeamRow[] {
  const rows = new Map<string, TeamRow>(teamIds.map((id) => [id, emptyRow(id)]));

  for (const m of matches) {
    const score = effectiveScore(m);
    if (!score) continue;
    const home = rows.get(m.homeTeamId);
    const away = rows.get(m.awayTeamId);
    if (!home || !away) continue;

    const [hs, as] = score;
    home.played++;
    away.played++;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;

    if (hs > as) {
      home.wins++;
      away.losses++;
      home.form.push("V");
      away.form.push("D");
    } else if (hs < as) {
      away.wins++;
      home.losses++;
      home.form.push("D");
      away.form.push("V");
    } else {
      home.draws++;
      away.draws++;
      home.form.push("E");
      away.form.push("E");
    }
  }

  for (const row of rows.values()) {
    row.points =
      row.wins * rules.pointsWin +
      row.draws * rules.pointsDraw +
      row.losses * rules.pointsLoss;
    row.goalDiff = row.goalsFor - row.goalsAgainst;
    const maxPoints = row.played * rules.pointsWin;
    row.efficiency = maxPoints > 0 ? Math.round((row.points / maxPoints) * 100) : 0;
    row.form = row.form.slice(-5);
  }

  const sorted = [...rows.values()].sort((a, b) =>
    compareRows(a, b, rules.tiebreakers, matches, rules),
  );
  sorted.forEach((row, i) => (row.position = i + 1));
  return sorted;
}

function compareRows(
  a: TeamRow,
  b: TeamRow,
  tiebreakers: Tiebreaker[],
  matches: StandingsMatch[],
  rules: StandingsRules,
): number {
  for (const tb of tiebreakers) {
    let diff = 0;
    switch (tb) {
      case "PONTOS":
        diff = b.points - a.points;
        break;
      case "VITORIAS":
        diff = b.wins - a.wins;
        break;
      case "SALDO":
        diff = b.goalDiff - a.goalDiff;
        break;
      case "GOLS_PRO":
        diff = b.goalsFor - a.goalsFor;
        break;
      case "GOLS_CONTRA":
        diff = a.goalsAgainst - b.goalsAgainst;
        break;
      case "CONFRONTO_DIRETO":
        diff = headToHead(a.teamId, b.teamId, matches, rules);
        break;
      case "CARTOES":
        // Cartões exigem dados de eventos; tratado como neutro aqui e
        // desempatado pelos critérios seguintes.
        diff = 0;
        break;
      case "SORTEIO":
        // Determinístico para estabilidade da tabela (sorteio real é ato manual).
        diff = a.teamId.localeCompare(b.teamId);
        break;
    }
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Pontos somente nos confrontos diretos entre as duas equipes. */
function headToHead(
  teamA: string,
  teamB: string,
  matches: StandingsMatch[],
  rules: StandingsRules,
): number {
  let pointsA = 0;
  let pointsB = 0;
  for (const m of matches) {
    const between =
      (m.homeTeamId === teamA && m.awayTeamId === teamB) ||
      (m.homeTeamId === teamB && m.awayTeamId === teamA);
    if (!between) continue;
    const score = effectiveScore(m);
    if (!score) continue;
    const [hs, as] = score;
    const homeIsA = m.homeTeamId === teamA;
    if (hs > as) {
      if (homeIsA) pointsA += rules.pointsWin;
      else pointsB += rules.pointsWin;
    } else if (hs < as) {
      if (homeIsA) pointsB += rules.pointsWin;
      else pointsA += rules.pointsWin;
    } else {
      pointsA += rules.pointsDraw;
      pointsB += rules.pointsDraw;
    }
  }
  return pointsB - pointsA;
}
