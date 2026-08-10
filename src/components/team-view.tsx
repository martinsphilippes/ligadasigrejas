import Link from "next/link";
import { db } from "@/lib/db";
import { getStandings } from "@/lib/data/standings";
import { COUNTED_STATUSES } from "@/lib/domain/enums";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { MatchCard } from "@/components/match-card";
import { AthleteCard } from "@/components/athlete-card";

/**
 * Visão completa de uma equipe dentro da liga: campanha (pontuação),
 * jogos da equipe, elenco e comissão. Usada em "Equipes > detalhe"
 * e em "Minha Equipe".
 */
export async function TeamView({
  leagueId,
  leagueSlug,
  teamId,
  canManageSquad,
}: {
  leagueId: string;
  leagueSlug: string;
  teamId: string;
  canManageSquad: boolean;
}) {
  const [team, standings, matches] = await Promise.all([
    db.leagueTeam.findUnique({
      where: { id: teamId },
      include: {
        church: {
          include: {
            athletes: {
              where: { active: true },
              orderBy: [{ squadRole: "desc" }, { name: "asc" }],
            },
            staff: { orderBy: { name: "asc" } },
          },
        },
      },
    }),
    getStandings(leagueId),
    db.match.findMany({
      where: {
        leagueId,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: {
        homeTeam: { include: { church: true } },
        awayTeam: { include: { church: true } },
        venue: true,
        round: true,
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  if (!team || team.leagueId !== leagueId) return null;

  const campaign = standings.find((row) => row.teamId === teamId);
  const played = matches.filter((m) =>
    COUNTED_STATUSES.includes(m.status as (typeof COUNTED_STATUSES)[number]),
  );
  const upcoming = matches.filter(
    (m) => m.status === "AGENDADO" || m.status === "EM_ANDAMENTO" || m.status === "ADIADO",
  );

  // Estatísticas individuais (gols e cartões) da equipe na liga
  const events = await db.matchEvent.groupBy({
    by: ["athleteId", "type"],
    where: {
      teamId,
      athleteId: { not: null },
      match: { leagueId, status: { in: [...COUNTED_STATUSES] } },
    },
    _count: { _all: true },
  });
  const statsByAthlete = new Map<string, { goals: number; yellow: number; red: number }>();
  for (const e of events) {
    if (!e.athleteId) continue;
    const s = statsByAthlete.get(e.athleteId) ?? { goals: 0, yellow: 0, red: 0 };
    if (e.type === "GOL") s.goals += e._count._all;
    if (e.type === "CARTAO_AMARELO") s.yellow += e._count._all;
    if (e.type === "CARTAO_VERMELHO") s.red += e._count._all;
    statsByAthlete.set(e.athleteId, s);
  }
  const scorers = team.church.athletes
    .flatMap((a) => {
      const stats = statsByAthlete.get(a.id);
      return stats ? [{ athlete: a, stats }] : [];
    })
    .sort((a, b) => b.stats.goals - a.stats.goals);

  const titulares = team.church.athletes.filter((a) => a.squadRole === "TITULAR");
  const reservas = team.church.athletes.filter((a) => a.squadRole !== "TITULAR");

  return (
    <div className="space-y-6">
      {/* Cabeçalho da equipe */}
      <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-up">
        <div className="flex items-center gap-4">
          <Avatar
            name={team.church.name}
            src={team.church.crestUrl}
            shape="shield"
            size="xl"
          />
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              {team.church.name}
            </h2>
            <p className="text-sm text-zinc-500">
              {team.church.denomination} · {team.church.city}/{team.church.state}
            </p>
            <Link
              href={`/igrejas/${team.church.id}`}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Ver ficha completa da igreja →
            </Link>
          </div>
        </div>
        {campaign && (
          <div className="rounded-xl bg-brand-800 px-5 py-3 text-center text-white shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-200">
              Posição
            </p>
            <p className="text-2xl font-bold">{campaign.position}º</p>
          </div>
        )}
      </div>

      {/* Pontuação da equipe (campanha) */}
      {campaign && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <StatCard label="Pontos" value={campaign.points} />
          <StatCard label="Jogos" value={campaign.played} />
          <StatCard label="Vitórias" value={campaign.wins} />
          <StatCard label="Empates" value={campaign.draws} />
          <StatCard label="Derrotas" value={campaign.losses} />
          <StatCard label="Gols pró" value={campaign.goalsFor} />
          <StatCard
            label="Saldo"
            value={campaign.goalDiff > 0 ? `+${campaign.goalDiff}` : campaign.goalDiff}
          />
          <StatCard label="Aproveit." value={`${campaign.efficiency}%`} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Próximos jogos da equipe */}
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Próximos jogos
          </h3>
          {upcoming.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-400">
              Nenhum jogo agendado.
            </p>
          ) : (
            <div className="space-y-2.5">
              {upcoming.slice(0, 5).map((m) => (
                <MatchCard key={m.id} match={m} leagueSlug={leagueSlug} showRound />
              ))}
            </div>
          )}
        </section>

        {/* Histórico (jogos realizados) */}
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Histórico
          </h3>
          {played.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-400">
              Nenhum jogo realizado ainda.
            </p>
          ) : (
            <div className="space-y-2.5">
              {[...played]
                .reverse()
                .slice(0, 5)
                .map((m) => (
                  <MatchCard key={m.id} match={m} leagueSlug={leagueSlug} showRound />
                ))}
            </div>
          )}
        </section>
      </div>

      {/* Estatísticas individuais */}
      {scorers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas dos atletas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    <th className="py-2 pr-2">Atleta</th>
                    <th className="px-2 py-2 text-center">⚽ Gols</th>
                    <th className="px-2 py-2 text-center">🟨</th>
                    <th className="px-2 py-2 text-center">🟥</th>
                  </tr>
                </thead>
                <tbody>
                  {scorers.map(({ athlete, stats }) => (
                    <tr key={athlete.id} className="border-b border-zinc-100 last:border-0">
                      <td className="flex items-center gap-2.5 py-2 pr-2">
                        <Avatar name={athlete.name} src={athlete.photoUrl} size="xs" />
                        <span className="font-medium text-zinc-800">{athlete.name}</span>
                      </td>
                      <td className="px-2 py-2 text-center font-bold tabular-nums text-brand-800">
                        {stats.goals}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums text-zinc-500">
                        {stats.yellow}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums text-zinc-500">
                        {stats.red}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Elenco */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Elenco — Titulares ({titulares.length})
        </h3>
        {titulares.length === 0 ? (
          <p className="mb-4 text-sm text-zinc-400">Nenhum titular definido.</p>
        ) : (
          <div className="mb-5 grid gap-2 sm:grid-cols-2">
            {titulares.map((a) => (
              <AthleteCard key={a.id} athlete={a} canManage={canManageSquad} />
            ))}
          </div>
        )}
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Reservas ({reservas.length})
        </h3>
        {reservas.length === 0 ? (
          <p className="text-sm text-zinc-400">Sem reservas.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {reservas.map((a) => (
              <AthleteCard key={a.id} athlete={a} canManage={canManageSquad} />
            ))}
          </div>
        )}
      </section>

      {/* Comissão técnica */}
      {team.church.staff.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comissão técnica</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {team.church.staff.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-lg bg-zinc-50/80 px-3 py-2">
                  <Avatar name={s.name} src={s.photoUrl} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{s.name}</p>
                    <p className="text-xs text-zinc-500">{s.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
