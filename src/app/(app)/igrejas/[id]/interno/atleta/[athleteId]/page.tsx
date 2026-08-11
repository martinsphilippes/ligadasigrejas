import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getAthleteEvolution } from "@/lib/data/internal";
import { cn, formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Evolução do Atleta" };

export default async function AthleteEvolutionPage({
  params,
}: {
  params: Promise<{ id: string; athleteId: string }>;
}) {
  const { id, athleteId } = await params;
  await requireUser();

  const athlete = await db.athlete.findUnique({
    where: { id: athleteId },
    include: { church: { select: { name: true } } },
  });
  if (!athlete || athlete.churchId !== id) notFound();

  const [evolution, changes] = await Promise.all([
    getAthleteEvolution(athleteId),
    db.squadChange.findMany({
      where: { athleteId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const played = evolution.filter((p) => p.attended);
  const totals = {
    games: played.length,
    wins: played.filter((p) => p.result === "V").length,
    goals: played.reduce((n, p) => n + p.goals, 0),
    assists: played.reduce((n, p) => n + p.assists, 0),
    highlights: played.filter((p) => p.highlight).length,
    absences: evolution.filter((p) => !p.attended).length,
  };
  const rated = played.filter((p) => p.rating != null);
  const avgRating =
    rated.length > 0
      ? rated.reduce((n, p) => n + (p.rating ?? 0), 0) / rated.length
      : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <ButtonLink variant="secondary" size="sm" href={`/igrejas/${id}/interno`}>
          ← Jogos internos
        </ButtonLink>
      </div>

      {/* Cabeçalho do atleta */}
      <div className="mb-6 flex items-center gap-4 animate-fade-up">
        <Avatar name={athlete.name} src={athlete.photoUrl} size="xl" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{athlete.name}</h1>
          <p className="text-sm text-zinc-500">{athlete.church.name}</p>
          <span className="mt-1 inline-block">
            <Badge tone={athlete.squadRole === "TITULAR" ? "green" : "neutral"}>
              {athlete.squadRole === "TITULAR" ? "Titular" : "Reserva"}
            </Badge>
          </span>
        </div>
      </div>

      {/* Resumo */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-7">
        {[
          ["Jogos", totals.games],
          ["Vitórias", totals.wins],
          ["Gols", totals.goals],
          ["Assist.", totals.assists],
          ["⭐", totals.highlights],
          ["Nota", avgRating != null ? avgRating.toFixed(1) : "—"],
          ["Faltas", totals.absences],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-center shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              {label}
            </p>
            <p className="text-lg font-bold tabular-nums text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      {evolution.length === 0 ? (
        <EmptyState
          icon="📈"
          title="Sem jogos internos ainda"
          description="Quando o atleta participar de treinos finalizados, a evolução aparece aqui."
        />
      ) : (
        <div className="space-y-6">
          {/* Gráfico de evolução */}
          <Card>
            <CardHeader>
              <CardTitle>📈 Evolução — nota e participações por jogo</CardTitle>
            </CardHeader>
            <CardContent>
              <EvolutionChart evolution={evolution} />
              <p className="mt-2 text-xs text-zinc-400">
                Barras: gols (verde) e assistências (azul) · Linha: nota do jogo (1–5) ·
                ⭐ destaque da partida · F = faltou
              </p>
            </CardContent>
          </Card>

          {/* Linha do tempo dos jogos */}
          <Card>
            <CardHeader>
              <CardTitle>Jogo a jogo</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-zinc-100">
                {[...evolution].reverse().map((p) => (
                  <li key={p.matchId} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                    <span className="w-20 shrink-0 text-xs text-zinc-400">
                      {p.date ? formatDate(p.date) : "—"}
                    </span>
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        !p.attended
                          ? "bg-red-100 text-red-600"
                          : p.result === "V"
                            ? "bg-brand-600 text-white"
                            : p.result === "D"
                              ? "bg-red-500 text-white"
                              : "bg-zinc-300 text-zinc-700",
                      )}
                    >
                      {!p.attended ? "F" : (p.result ?? "—")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-zinc-700">{p.label}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-zinc-500">
                      {p.goals > 0 && <span>⚽ {p.goals}</span>}
                      {p.assists > 0 && <span>🅰️ {p.assists}</span>}
                      {p.highlight && <span>⭐</span>}
                      {p.rating != null && (
                        <span className="font-semibold text-amber-500">{p.rating}★</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Movimentações */}
          {changes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>📋 Movimentações no elenco</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {changes.map((c) => (
                    <li key={c.id}>
                      <span
                        className={cn(
                          "font-semibold",
                          c.to === "TITULAR" ? "text-brand-700" : "text-zinc-500",
                        )}
                      >
                        {c.to === "TITULAR" ? "↑ Promovido a titular" : "↓ Movido para reserva"}
                      </span>
                      <span className="ml-2 text-xs text-zinc-400">{formatDate(c.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}

/** Gráfico SVG server-rendered: barras de gols/assistências + linha da nota. */
function EvolutionChart({
  evolution,
}: {
  evolution: Awaited<ReturnType<typeof getAthleteEvolution>>;
}) {
  const W = 640;
  const H = 180;
  const padX = 24;
  const padY = 16;
  const chartH = H - padY * 2;
  const n = evolution.length;
  const step = (W - padX * 2) / Math.max(n, 1);
  const maxBar = Math.max(2, ...evolution.map((p) => p.goals + p.assists));

  const ratingY = (r: number) => padY + chartH - ((r - 1) / 4) * chartH;
  const ratingPoints = evolution
    .map((p, i) =>
      p.rating != null && p.attended
        ? `${(padX + step * i + step / 2).toFixed(1)},${ratingY(p.rating).toFixed(1)}`
        : null,
    )
    .filter(Boolean)
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="min-w-[480px] w-full"
        role="img"
        aria-label="Gráfico de evolução do atleta"
      >
        {/* linhas-guia da nota (1 a 5) */}
        {[1, 2, 3, 4, 5].map((r) => (
          <g key={r}>
            <line
              x1={padX}
              x2={W - padX}
              y1={ratingY(r)}
              y2={ratingY(r)}
              stroke="#e4e4e7"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
            <text x={4} y={ratingY(r) + 3} fontSize="9" fill="#a1a1aa">
              {r}★
            </text>
          </g>
        ))}

        {/* barras de gols e assistências */}
        {evolution.map((p, i) => {
          const cx = padX + step * i + step / 2;
          const barW = Math.min(22, step * 0.5);
          const goalH = (p.goals / maxBar) * (chartH * 0.85);
          const assistH = (p.assists / maxBar) * (chartH * 0.85);
          const baseY = padY + chartH;
          return (
            <g key={p.matchId}>
              {!p.attended && (
                <text x={cx} y={baseY - 4} fontSize="11" fill="#ef4444" textAnchor="middle" fontWeight="bold">
                  F
                </text>
              )}
              {p.goals > 0 && (
                <rect
                  x={cx - barW / 2}
                  y={baseY - goalH}
                  width={barW}
                  height={goalH}
                  rx="2"
                  fill="#2f9d66"
                />
              )}
              {p.assists > 0 && (
                <rect
                  x={cx - barW / 2}
                  y={baseY - goalH - assistH}
                  width={barW}
                  height={assistH}
                  rx="2"
                  fill="#38bdf8"
                />
              )}
              {p.highlight && (
                <text x={cx} y={padY + 2} fontSize="11" textAnchor="middle">
                  ⭐
                </text>
              )}
            </g>
          );
        })}

        {/* linha da nota */}
        {ratingPoints.split(" ").length > 1 && (
          <polyline
            points={ratingPoints}
            fill="none"
            stroke="#eab030"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {evolution.map((p, i) =>
          p.rating != null && p.attended ? (
            <circle
              key={p.matchId}
              cx={padX + step * i + step / 2}
              cy={ratingY(p.rating)}
              r="4"
              fill="#eab030"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          ) : null,
        )}
      </svg>
    </div>
  );
}
