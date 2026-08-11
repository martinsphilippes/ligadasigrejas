import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getLeagueAccess } from "@/lib/permissions";

/** Liga pelo slug com regras e esporte; 404 se não existir. Cacheada por requisição. */
export const getLeague = cache(async (slug: string) => {
  const league = await db.league.findUnique({
    where: { slug },
    include: { rules: true, sport: true },
  });
  if (!league) notFound();
  return league;
});

/** Liga + usuário logado + acesso — ponto de entrada padrão das telas da liga. */
export const getLeagueContext = cache(async (slug: string) => {
  const [league, user] = await Promise.all([getLeague(slug), requireUser()]);
  const access = await getLeagueAccess(league.id, user.sub);
  return { league, user, access };
});

/** Equipes da liga com igreja e contagem de atletas. */
export const getLeagueTeams = cache(async (leagueId: string) => {
  return db.leagueTeam.findMany({
    where: { leagueId },
    include: {
      church: { include: { _count: { select: { athletes: true } } } },
    },
    orderBy: { church: { name: "asc" } },
  });
});

/**
 * Equipe do usuário dentro da liga (para "Minha Equipe"): via papel de
 * organização vinculado a uma igreja ou, na falta dele, pela igreja da qual
 * o usuário faz parte (ingresso aceito).
 */
export const getMyTeam = cache(async (leagueId: string, userId: string) => {
  const [membership, user] = await Promise.all([
    db.leagueMember.findFirst({
      where: { leagueId, userId, churchId: { not: null } },
    }),
    db.user.findUnique({ where: { id: userId }, select: { churchId: true } }),
  ]);
  const churchId = membership?.churchId ?? user?.churchId;
  if (!churchId) return null;
  return db.leagueTeam.findFirst({
    where: { leagueId, churchId },
    include: { church: true },
  });
});
