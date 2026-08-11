import Link from "next/link";
import { db } from "@/lib/db";
import { getLeagueContext } from "@/lib/data/league";
import { getStandings } from "@/lib/data/standings";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { MatchCard } from "@/components/match-card";
import { StandingsTable } from "@/components/standings-table";
import { AnnouncementForm } from "./announcement-form";
import { AnnouncementItem } from "./announcement-item";

export default async function LeagueDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { league, access } = await getLeagueContext(slug);
  const manage = can(access, "league.manage");

  const [
    standings,
    teamCount,
    athleteCount,
    nextMatches,
    lastMatches,
    announcements,
    currentRound,
    totalMatches,
    playedMatches,
  ] = await Promise.all([
      getStandings(league.id),
      db.leagueTeam.count({ where: { leagueId: league.id } }),
      db.athlete.count({
        where: { active: true, church: { leagueTeams: { some: { leagueId: league.id } } } },
      }),
      db.match.findMany({
        where: { leagueId: league.id, status: { in: ["AGENDADO", "ADIADO"] } },
        include: {
          homeTeam: { include: { church: true } },
          awayTeam: { include: { church: true } },
          venue: true,
          round: true,
        },
        orderBy: [{ scheduledAt: "asc" }],
        take: 4,
      }),
      db.match.findMany({
        where: { leagueId: league.id, status: { in: ["FINALIZADO", "WO"] } },
        include: {
          homeTeam: { include: { church: true } },
          awayTeam: { include: { church: true } },
          venue: true,
          round: true,
        },
        orderBy: [{ scheduledAt: "desc" }],
        take: 4,
      }),
      db.announcement.findMany({
        where: { leagueId: league.id },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 6,
      }),
      // Rodada atual: a primeira com jogos ainda não finalizados.
      db.round.findFirst({
        where: {
          leagueId: league.id,
          matches: { some: { status: { in: ["AGENDADO", "EM_ANDAMENTO", "ADIADO"] } } },
        },
        orderBy: { number: "asc" },
      }),
      db.match.count({ where: { leagueId: league.id } }),
      db.match.count({
        where: { leagueId: league.id, status: { in: ["FINALIZADO", "WO"] } },
      }),
    ]);

  return (
    <div className="space-y-6">
      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Equipes" value={teamCount} icon="🛡" />
        <StatCard label="Atletas" value={athleteCount} icon="👟" />
        <StatCard
          label="Rodada atual"
          value={currentRound ? `${currentRound.number}ª` : "—"}
          hint={currentRound?.name ?? undefined}
          icon="🗓"
        />
        <StatCard
          label="Jogos"
          value={`${playedMatches}/${totalMatches}`}
          hint="realizados"
          icon="⚽"
        />
      </div>

      {/* Avisos */}
      {(announcements.length > 0 || manage) && (
        <Card>
          <CardHeader>
            <CardTitle>📣 Avisos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 && (
              <p className="text-sm text-zinc-400">Nenhum aviso publicado.</p>
            )}
            {announcements.map((a) => (
              <AnnouncementItem
                key={a.id}
                leagueId={league.id}
                announcement={a}
                canManage={manage}
              />
            ))}
            {manage && <AnnouncementForm leagueId={league.id} />}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Próximas partidas */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Próximas partidas
            </h2>
            <Link
              href={`/ligas/${league.slug}/jogos`}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          {nextMatches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-400">
              Nenhuma partida agendada.
            </p>
          ) : (
            <div className="space-y-2.5">
              {nextMatches.map((m) => (
                <MatchCard key={m.id} match={m} leagueSlug={league.slug} showRound />
              ))}
            </div>
          )}
        </section>

        {/* Últimas partidas */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Últimas partidas
            </h2>
            <Link
              href={`/ligas/${league.slug}/jogos?filtro=realizados`}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          {lastMatches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-400">
              Nenhuma partida realizada ainda.
            </p>
          ) : (
            <div className="space-y-2.5">
              {lastMatches.map((m) => (
                <MatchCard key={m.id} match={m} leagueSlug={league.slug} showRound />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Resumo da classificação */}
      {standings.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Classificação
            </h2>
            <Link
              href={`/ligas/${league.slug}/classificacao`}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Tabela completa →
            </Link>
          </div>
          <StandingsTable
            standings={standings.slice(0, 6)}
            leagueSlug={league.slug}
            compact
          />
        </section>
      )}

      {/* Resumo da competição */}
      {league.description && (
        <Card>
          <CardHeader>
            <CardTitle>Sobre a competição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">
              {league.description}
            </p>
            <div className="mt-3 flex gap-4 text-xs text-zinc-400">
              {league.startDate && <span>Início: {formatDate(league.startDate)}</span>}
              {league.endDate && <span>Término: {formatDate(league.endDate)}</span>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
