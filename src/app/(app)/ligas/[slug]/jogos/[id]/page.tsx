import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getLeagueContext } from "@/lib/data/league";
import { can } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { EVENT_TYPE, label } from "@/lib/domain/enums";
import { Avatar } from "@/components/ui/avatar";
import { MatchStatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import {
  deleteMatchAction,
  deleteMatchEventAction,
} from "@/lib/actions/schedule";
import { ResultForm } from "./result-form";
import { EventForm } from "./event-form";
import { RescheduleForm } from "./reschedule-form";

export const metadata: Metadata = { title: "Detalhes da Partida" };

const EVENT_ICON: Record<string, string> = {
  GOL: "⚽",
  GOL_CONTRA: "🥅",
  CARTAO_AMARELO: "🟨",
  CARTAO_VERMELHO: "🟥",
};

export default async function MatchPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { league, access } = await getLeagueContext(slug);

  const match = await db.match.findUnique({
    where: { id },
    include: {
      homeTeam: { include: { church: { include: { athletes: { where: { active: true } } } } } },
      awayTeam: { include: { church: { include: { athletes: { where: { active: true } } } } } },
      venue: true,
      round: true,
      events: {
        include: { athlete: true },
        orderBy: [{ minute: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!match || match.leagueId !== league.id) notFound();

  const canRecord = can(access, "results.record");
  const canSchedule = can(access, "schedule.manage");
  const finished = match.status === "FINALIZADO" || match.status === "WO";

  const [venues, rounds] = canSchedule
    ? await Promise.all([
        db.venue.findMany({ where: { leagueId: league.id }, orderBy: { name: "asc" } }),
        db.round.findMany({ where: { leagueId: league.id }, orderBy: { number: "asc" } }),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      {/* Placar */}
      <Card className="overflow-hidden">
        <div className="bg-brand-950 px-6 py-8 text-white">
          <div className="mb-4 flex items-center justify-center gap-3 text-xs text-brand-200">
            <span>
              {match.round && `${match.round.name ?? `Rodada ${match.round.number}`} · `}
              {formatDateTime(match.scheduledAt)}
              {match.venue && ` · ${match.venue.name}`}
            </span>
            <MatchStatusBadge status={match.status} />
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-end sm:text-right">
              <span className="order-2 font-semibold sm:order-1">
                {match.homeTeam.church.name}
              </span>
              <Avatar
                name={match.homeTeam.church.name}
                src={match.homeTeam.church.crestUrl}
                shape="shield"
                size="lg"
                className="order-1 sm:order-2"
              />
            </div>
            <div className="text-center">
              {finished ? (
                <>
                  <p className="text-4xl font-bold tabular-nums tracking-tight">
                    {match.status === "WO"
                      ? match.woWinnerId === match.homeTeamId
                        ? "3 – 0"
                        : "0 – 3"
                      : `${match.homeScore} – ${match.awayScore}`}
                  </p>
                  {match.homePenalties != null && match.awayPenalties != null && (
                    <p className="mt-1 text-xs text-brand-200">
                      Pênaltis: {match.homePenalties} – {match.awayPenalties}
                    </p>
                  )}
                  {match.status === "WO" && (
                    <p className="mt-1 text-xs text-gold-400">Vitória por W.O.</p>
                  )}
                </>
              ) : (
                <p className="text-2xl font-bold text-brand-300">×</p>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
              <Avatar
                name={match.awayTeam.church.name}
                src={match.awayTeam.church.crestUrl}
                shape="shield"
                size="lg"
              />
              <span className="font-semibold">{match.awayTeam.church.name}</span>
            </div>
          </div>
        </div>
        {match.notes && (
          <CardContent className="pt-4">
            <p className="text-sm text-zinc-600">
              <strong className="text-zinc-800">Observações:</strong> {match.notes}
            </p>
          </CardContent>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Súmula / eventos */}
        <Card>
          <CardHeader>
            <CardTitle>Súmula da partida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {match.events.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Nenhum gol ou cartão registrado.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {match.events.map((event) => {
                  const isHome = event.teamId === match.homeTeamId;
                  const teamName = isHome
                    ? match.homeTeam.church.name
                    : match.awayTeam.church.name;
                  return (
                    <li
                      key={event.id}
                      className="flex items-center gap-3 rounded-lg bg-zinc-50/80 px-3 py-2 text-sm"
                    >
                      <span>{EVENT_ICON[event.type] ?? "•"}</span>
                      <span className="w-10 shrink-0 text-xs tabular-nums text-zinc-400">
                        {event.minute != null ? `${event.minute}'` : "—"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-800">
                          {event.athlete?.name ?? "Atleta não informado"}
                        </p>
                        <p className="truncate text-xs text-zinc-400">
                          {label(EVENT_TYPE, event.type)} · {teamName}
                        </p>
                      </div>
                      {canRecord && (
                        <form action={deleteMatchEventAction.bind(null, league.id, event.id)}>
                          <ConfirmButton
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-[11px] text-red-500 hover:bg-red-50"
                            message="Excluir este evento?"
                          >
                            ×
                          </ConfirmButton>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {canRecord && (
              <EventForm
                leagueId={league.id}
                matchId={match.id}
                teams={[
                  {
                    id: match.homeTeamId,
                    name: match.homeTeam.church.name,
                    athletes: match.homeTeam.church.athletes.map((a) => ({
                      id: a.id,
                      name: a.name,
                    })),
                  },
                  {
                    id: match.awayTeamId,
                    name: match.awayTeam.church.name,
                    athletes: match.awayTeam.church.athletes.map((a) => ({
                      id: a.id,
                      name: a.name,
                    })),
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Registro de resultado */}
          {canRecord && (
            <Card>
              <CardHeader>
                <CardTitle>Registrar resultado</CardTitle>
              </CardHeader>
              <CardContent>
                <ResultForm
                  leagueId={league.id}
                  matchId={match.id}
                  initial={{
                    status: match.status,
                    homeScore: match.homeScore,
                    awayScore: match.awayScore,
                    homePenalties: match.homePenalties,
                    awayPenalties: match.awayPenalties,
                    woWinnerId: match.woWinnerId,
                    notes: match.notes,
                  }}
                  homeTeam={{ id: match.homeTeamId, name: match.homeTeam.church.name }}
                  awayTeam={{ id: match.awayTeamId, name: match.awayTeam.church.name }}
                />
              </CardContent>
            </Card>
          )}

          {/* Reagendamento */}
          {canSchedule && (
            <Card>
              <CardHeader>
                <CardTitle>Agendamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RescheduleForm
                  leagueId={league.id}
                  matchId={match.id}
                  initial={{
                    scheduledAt: match.scheduledAt,
                    venueId: match.venueId,
                    roundId: match.roundId,
                  }}
                  venues={venues.map((v) => ({ id: v.id, name: v.name }))}
                  rounds={rounds.map((r) => ({
                    id: r.id,
                    name: r.name ?? `Rodada ${r.number}`,
                  }))}
                />
                <form
                  action={deleteMatchAction.bind(null, league.id, match.id)}
                  className="border-t border-zinc-100 pt-3 text-right"
                >
                  <ConfirmButton
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                    message="Excluir esta partida? Eventos registrados serão perdidos."
                  >
                    Excluir partida
                  </ConfirmButton>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
