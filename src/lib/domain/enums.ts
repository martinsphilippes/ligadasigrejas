// Enums do domínio como constantes tipadas (SQLite não suporta enums nativos).
// Toda validação de valores passa por aqui — nunca use strings soltas nas telas.

export const LEAGUE_STATUS = {
  INSCRICOES: "Inscrições abertas",
  EM_ANDAMENTO: "Em andamento",
  PAUSADA: "Pausada",
  ENCERRADA: "Encerrada",
} as const;
export type LeagueStatus = keyof typeof LEAGUE_STATUS;

export const LEAGUE_FORMAT = {
  PONTOS_CORRIDOS: "Pontos corridos",
  GRUPOS: "Fase de grupos",
  MATA_MATA: "Mata-mata",
  GRUPOS_MATA_MATA: "Grupos + mata-mata",
} as const;
export type LeagueFormat = keyof typeof LEAGUE_FORMAT;

export const MATCH_STATUS = {
  AGENDADO: "Agendado",
  EM_ANDAMENTO: "Em andamento",
  FINALIZADO: "Finalizado",
  WO: "W.O.",
  ADIADO: "Adiado",
  CANCELADO: "Cancelado",
} as const;
export type MatchStatus = keyof typeof MATCH_STATUS;

/** Partidas que contam para classificação e estatísticas. */
export const COUNTED_STATUSES: MatchStatus[] = ["FINALIZADO", "WO"];

export const EVENT_TYPE = {
  GOL: "Gol",
  GOL_CONTRA: "Gol contra",
  CARTAO_AMARELO: "Cartão amarelo",
  CARTAO_VERMELHO: "Cartão vermelho",
} as const;
export type EventType = keyof typeof EVENT_TYPE;

// Posições por esporte — adicionar novos esportes = adicionar entradas aqui.
export const POSITIONS_BY_SPORT: Record<string, Record<string, string>> = {
  futsal: {
    GOLEIRO: "Goleiro",
    FIXO: "Fixo",
    ALA: "Ala",
    PIVO: "Pivô",
  },
};

export const SQUAD_ROLE = {
  TITULAR: "Titular",
  RESERVA: "Reserva",
} as const;
export type SquadRole = keyof typeof SQUAD_ROLE;

export const MEMBER_ROLE = {
  ORGANIZADOR_GERAL: "Organizador Geral",
  ORGANIZADOR_IGREJA: "Organizador da Igreja",
  ADMIN_EQUIPE: "Administrador da Equipe",
  MESARIO: "Mesário",
  ARBITRO: "Árbitro",
} as const;
export type MemberRole = keyof typeof MEMBER_ROLE;

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  ORGANIZADOR_GERAL:
    "Administra toda a liga: equipes, jogos, regras, agenda e resultados.",
  ORGANIZADOR_IGREJA:
    "Administra os dados da sua igreja e do elenco dela dentro da liga.",
  ADMIN_EQUIPE:
    "Gerencia o elenco da equipe: atletas, titulares, reservas e comissão técnica.",
  MESARIO: "Registra resultados, gols e cartões das partidas.",
  ARBITRO: "Consulta a agenda de jogos e registra ocorrências das partidas.",
};

export const TIEBREAKER = {
  PONTOS: "Pontos",
  VITORIAS: "Vitórias",
  SALDO: "Saldo de gols",
  GOLS_PRO: "Gols pró",
  GOLS_CONTRA: "Menos gols sofridos",
  CONFRONTO_DIRETO: "Confronto direto",
  CARTOES: "Menos cartões",
  SORTEIO: "Sorteio",
} as const;
export type Tiebreaker = keyof typeof TIEBREAKER;

export const ROUND_PHASE = {
  PONTOS_CORRIDOS: "Pontos corridos",
  GRUPOS: "Fase de grupos",
  REPESCAGEM: "Repescagem",
  OITAVAS: "Oitavas de final",
  QUARTAS: "Quartas de final",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
} as const;
export type RoundPhase = keyof typeof ROUND_PHASE;

export function label<T extends Record<string, string>>(
  map: T,
  key: string | null | undefined,
  fallback = "—",
): string {
  if (!key) return fallback;
  return map[key as keyof T] ?? fallback;
}
