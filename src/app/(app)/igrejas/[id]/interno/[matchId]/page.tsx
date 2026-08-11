import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canManageChurch } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import {
  deleteInternalEventAction,
  deleteInternalMatchAction,
  setInternalPlayerAction,
  toggleAttendanceAction,
} from "@/lib/actions/internal";
import { InternalResultForm, InternalEventForm } from "./internal-forms";
import { RatingStars } from "./rating-stars";

export const metadata: Metadata = { title: "Jogo Interno" };

export default async function InternalMatchPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id, matchId } = await params;
  const user = await requireUser();

  const match = await db.internalMatch.findUnique({
    where: { id: matchId },
    include: {
      players: { include: { athlete: true } },
      events: { include: { athlete: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!match || match.churchId !== id) notFound();
  const manage = await canManageChurch(user.sub, match.churchId);

  const sideA = match.players.filter((p) => p.side === "A");
  const sideB = match.players.filter((p) => p.side === "B");
  const goals = match.events.filter((e) => e.type === "GOL");
  const assists = match.events.filter((e) => e.type === "ASSISTENCIA");
  const highlights = match.events.filter((e) => e.type === "DESTAQUE");
  const lineup = match.players.map((p) => ({ id: p.athleteId, name: p.athlete.name }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <ButtonLink variant="secondary" size="sm" href={`/igrejas/${id}/interno`}>
          ← Jogos internos
        </ButtonLink>
        <Badge
          tone={
            match.status === "FINALIZADO"
              ? "neutral"
              : match.status === "CANCELADO"
                ? "red"
                : "blue"
          }
        >
          {match.status === "FINALIZADO"
            ? "Finalizado"
            : match.status === "CANCELADO"
              ? "Cancelado"
              : "Agendado"}
        </Badge>
      </div>

      {/* Placar */}
      <Card className="mb-6 overflow-hidden">
        <div className="bg-brand-950 px-6 py-6 text-center text-white">
          <p className="mb-2 text-xs text-brand-200">
            {formatDateTime(match.scheduledAt)}
            {match.location && ` · ${match.location}`}
          </p>
          <p className="text-lg font-semibold">
            <span className="text-brand-200">{match.teamAName}</span>
            <span className="mx-3 text-3xl font-bold tabular-nums">
              {match.scoreA != null && match.scoreB != null
                ? `${match.scoreA} × ${match.scoreB}`
                : "×"}
            </span>
            <span className="text-gold-400">{match.teamBName}</span>
          </p>
          {match.notes && <p className="mt-2 text-xs text-brand-200/80">{match.notes}</p>}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Escalações */}
        <Card>
          <CardHeader>
            <CardTitle>Escalações</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[
              { label: match.teamAName, list: sideA, tone: "text-brand-700" },
              { label: match.teamBName, list: sideB, tone: "text-amber-600" },
            ].map(({ label, list, tone }) => (
              <div key={label}>
                <p className={`mb-2 text-xs font-bold uppercase tracking-wide ${tone}`}>
                  {label} ({list.length})
                </p>
                <ul className="space-y-1.5">
                  {list.map((p) => (
                    <li key={p.id} className="space-y-0.5">
                      <span className="flex items-center gap-2">
                        <Avatar name={p.athlete.name} src={p.athlete.photoUrl} size="xs" />
                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${
                            p.attended ? "text-zinc-800" : "text-zinc-400 line-through"
                          }`}
                        >
                          {p.athlete.name}
                        </span>
                        {!p.attended && (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                            Faltou
                          </span>
                        )}
                        {manage && (
                          <span className="flex gap-0.5">
                            <form action={toggleAttendanceAction.bind(null, match.id, p.athleteId)}>
                              <button
                                type="submit"
                                title={p.attended ? "Marcar falta" : "Remover falta"}
                                className="rounded px-1.5 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                              >
                                {p.attended ? "F" : "✓"}
                              </button>
                            </form>
                            {match.status !== "FINALIZADO" && (
                              <>
                                <form
                                  action={setInternalPlayerAction.bind(
                                    null,
                                    match.id,
                                    p.athleteId,
                                    p.side === "A" ? "B" : "A",
                                  )}
                                >
                                  <button
                                    type="submit"
                                    title="Trocar de time"
                                    className="rounded px-1.5 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                  >
                                    ⇄
                                  </button>
                                </form>
                                <form
                                  action={setInternalPlayerAction.bind(null, match.id, p.athleteId, "FORA")}
                                >
                                  <button
                                    type="submit"
                                    title="Tirar do jogo"
                                    className="rounded px-1.5 py-0.5 text-[11px] text-red-400 hover:bg-red-50 hover:text-red-600"
                                  >
                                    ×
                                  </button>
                                </form>
                              </>
                            )}
                          </span>
                        )}
                      </span>
                      {manage && p.attended && (
                        <span className="block pl-7">
                          <RatingStars
                            matchId={match.id}
                            athleteId={p.athleteId}
                            rating={p.rating}
                          />
                        </span>
                      )}
                      {!manage && p.rating != null && (
                        <span className="block pl-7 text-xs text-amber-500">
                          {"★".repeat(p.rating)}
                          <span className="text-zinc-300">{"★".repeat(5 - p.rating)}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Súmula */}
          <Card>
            <CardHeader>
              <CardTitle>Súmula</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {goals.length === 0 && assists.length === 0 && highlights.length === 0 && (
                <p className="text-sm text-zinc-400">Nenhum gol, assistência ou destaque registrado.</p>
              )}
              {(goals.length > 0 || assists.length > 0) && (
                <ul className="space-y-1.5">
                  {goals.map((e) => (
                    <li key={e.id} className="flex items-center gap-2.5 rounded-lg bg-zinc-50/80 px-3 py-2 text-sm">
                      <span>⚽</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">
                        {e.athlete.name}
                      </span>
                      {manage && (
                        <form action={deleteInternalEventAction.bind(null, e.id)}>
                          <button type="submit" className="rounded px-1.5 text-xs text-red-400 hover:bg-red-50">
                            ×
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                  {assists.map((e) => (
                    <li key={e.id} className="flex items-center gap-2.5 rounded-lg bg-sky-50/80 px-3 py-2 text-sm">
                      <span>🅰️</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-zinc-800">
                        {e.athlete.name}
                        <span className="ml-1.5 text-xs font-normal text-zinc-400">assistência</span>
                      </span>
                      {manage && (
                        <form action={deleteInternalEventAction.bind(null, e.id)}>
                          <button type="submit" className="rounded px-1.5 text-xs text-red-400 hover:bg-red-50">
                            ×
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {highlights.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">
                    ⭐ Destaques da partida
                  </p>
                  <ul className="space-y-1.5">
                    {highlights.map((e) => (
                      <li key={e.id} className="flex items-center gap-2.5 rounded-lg bg-amber-50 px-3 py-2 text-sm">
                        <Avatar name={e.athlete.name} src={e.athlete.photoUrl} size="xs" />
                        <span className="min-w-0 flex-1 truncate font-semibold text-zinc-800">
                          {e.athlete.name}
                        </span>
                        {manage && (
                          <form action={deleteInternalEventAction.bind(null, e.id)}>
                            <button type="submit" className="rounded px-1.5 text-xs text-red-400 hover:bg-red-50">
                              ×
                            </button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {manage && (
                <InternalEventForm
                  matchId={match.id}
                  lineup={lineup}
                  highlightsLeft={3 - highlights.length}
                />
              )}
            </CardContent>
          </Card>

          {/* Resultado / edição */}
          {manage && (
            <Card>
              <CardHeader>
                <CardTitle>Resultado e dados do jogo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InternalResultForm
                  matchId={match.id}
                  teamAName={match.teamAName}
                  teamBName={match.teamBName}
                  initial={{
                    status: match.status,
                    scoreA: match.scoreA,
                    scoreB: match.scoreB,
                    scheduledAt: match.scheduledAt,
                    location: match.location,
                    notes: match.notes,
                  }}
                />
                <form
                  action={deleteInternalMatchAction.bind(null, match.id)}
                  className="border-t border-zinc-100 pt-3 text-right"
                >
                  <ConfirmButton
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                    message="Excluir este jogo interno? Gols e destaques registrados serão perdidos."
                  >
                    Excluir jogo
                  </ConfirmButton>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
