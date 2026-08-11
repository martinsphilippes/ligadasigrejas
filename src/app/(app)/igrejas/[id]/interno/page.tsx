import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canManageChurch } from "@/lib/permissions";
import {
  getInternalStats,
  sortInternalStats,
  type InternalSort,
} from "@/lib/data/internal";
import { cn, formatDate, formatRelativeDay, formatTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { toggleSquadRoleAction } from "@/lib/actions/church";

export const metadata: Metadata = { title: "Jogos Internos" };

const SORTS: { key: InternalSort; label: string }[] = [
  { key: "destaques", label: "⭐ Destaques" },
  { key: "gols", label: "Gols" },
  { key: "vitorias", label: "Vitórias" },
  { key: "jogos", label: "Jogos" },
];

export default async function InternalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ord?: string; periodo?: string }>;
}) {
  const { id } = await params;
  const { ord = "destaques", periodo = "tudo" } = await searchParams;
  const user = await requireUser();

  const church = await db.church.findUnique({ where: { id } });
  if (!church) notFound();
  const manage = await canManageChurch(user.sub, church.id);

  const sinceDays = periodo === "30" ? 30 : undefined;
  const [statsRaw, matches, changes] = await Promise.all([
    getInternalStats(church.id, sinceDays),
    db.internalMatch.findMany({
      where: { churchId: church.id },
      include: { _count: { select: { players: true } } },
      orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
    db.squadChange.findMany({
      where: { athlete: { churchId: church.id } },
      include: { athlete: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const sort = (SORTS.some((s) => s.key === ord) ? ord : "destaques") as InternalSort;
  const stats = sortInternalStats(statsRaw, sort).filter((r) => r.games > 0);
  const base = `/igrejas/${church.id}/interno`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        title="⚽ Jogos Internos"
        description={`Treinos e rachas de ${church.name} — desempenho dos irmãos para a gestão do elenco.`}
        actions={
          <>
            <ButtonLink variant="secondary" href={`/igrejas/${church.id}`}>
              ← Igreja
            </ButtonLink>
            {manage && <ButtonLink href={`${base}/novo`}>+ Jogo interno</ButtonLink>}
          </>
        }
      />

      {/* Painel de desempenho */}
      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Desempenho nos treinos
          </h2>
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
            <Link
              href={`${base}?ord=${sort}`}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                periodo !== "30" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500",
              )}
            >
              Tudo
            </Link>
            <Link
              href={`${base}?ord=${sort}&periodo=30`}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                periodo === "30" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500",
              )}
            >
              Últimos 30 dias
            </Link>
          </div>
        </div>

        {stats.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-400">
            Finalize o primeiro jogo interno para o desempenho aparecer aqui.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  <th className="py-2.5 pl-4 pr-2">Atleta</th>
                  {SORTS.map((s) => (
                    <th key={s.key} className="px-2 py-2.5 text-center">
                      <Link
                        href={`${base}?ord=${s.key}${periodo === "30" ? "&periodo=30" : ""}`}
                        className={cn(
                          "transition-colors hover:text-brand-700",
                          sort === s.key && "text-brand-700 underline underline-offset-4",
                        )}
                      >
                        {s.label}
                      </Link>
                    </th>
                  ))}
                  <th className="py-2.5 pl-2 pr-4 text-right">Condição</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((row, i) => (
                  <tr
                    key={row.athleteId}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/70"
                  >
                    <td className="py-2.5 pl-4 pr-2">
                      <span className="flex items-center gap-2.5">
                        <span className="w-4 text-center text-xs font-bold text-zinc-400">
                          {i + 1}
                        </span>
                        <Avatar name={row.name} src={row.photoUrl} size="xs" />
                        <span className="font-medium text-zinc-800">{row.name}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center font-bold tabular-nums text-amber-600">
                      {row.highlights}
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-zinc-700">
                      {row.goals}
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-zinc-500">
                      {row.wins}
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-zinc-500">
                      {row.games}
                    </td>
                    <td className="py-2.5 pl-2 pr-4">
                      <span className="flex items-center justify-end gap-2">
                        <Badge tone={row.squadRole === "TITULAR" ? "green" : "neutral"}>
                          {row.squadRole === "TITULAR" ? "Titular" : "Reserva"}
                        </Badge>
                        {manage && (
                          <form action={toggleSquadRoleAction.bind(null, row.athleteId)}>
                            <button
                              type="submit"
                              className="rounded-md px-2 py-1 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                            >
                              {row.squadRole === "TITULAR" ? "↓ Reserva" : "↑ Titular"}
                            </button>
                          </form>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Histórico de jogos */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Jogos
          </h2>
          {matches.length === 0 ? (
            <EmptyState
              icon="⚽"
              title="Nenhum jogo interno ainda"
              description={
                manage
                  ? "Marque o primeiro treino e monte os times entre os irmãos."
                  : "Os jogos internos da igreja aparecerão aqui."
              }
              action={manage && <ButtonLink href={`${base}/novo`}>Marcar jogo interno</ButtonLink>}
            />
          ) : (
            <div className="space-y-2.5">
              {matches.map((m) => (
                <Link key={m.id} href={`${base}/${m.id}`} className="group block">
                  <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-brand-300 group-hover:shadow-md group-active:scale-[0.98] animate-fade-up">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-400">
                      <span>
                        {m.scheduledAt
                          ? `${formatRelativeDay(m.scheduledAt)} · ${formatTime(m.scheduledAt)}`
                          : "Data a definir"}
                        {m.location && ` · ${m.location}`}
                        {` · ${m._count.players} atletas`}
                      </span>
                      <Badge
                        tone={
                          m.status === "FINALIZADO"
                            ? "neutral"
                            : m.status === "CANCELADO"
                              ? "red"
                              : "blue"
                        }
                      >
                        {m.status === "FINALIZADO"
                          ? "Finalizado"
                          : m.status === "CANCELADO"
                            ? "Cancelado"
                            : "Agendado"}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {m.teamAName}{" "}
                      <span className="mx-1 font-bold tabular-nums">
                        {m.scoreA != null && m.scoreB != null
                          ? `${m.scoreA} × ${m.scoreB}`
                          : "×"}
                      </span>{" "}
                      {m.teamBName}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Movimentações do elenco */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>📋 Últimas movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            {changes.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Promoções e rebaixamentos do elenco aparecerão aqui.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {changes.map((c) => (
                  <li key={c.id} className="text-sm">
                    <span className="font-medium text-zinc-800">{c.athlete.name}</span>{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        c.to === "TITULAR" ? "text-brand-700" : "text-zinc-500",
                      )}
                    >
                      {c.to === "TITULAR" ? "↑ promovido a titular" : "↓ movido para reserva"}
                    </span>
                    <span className="block text-xs text-zinc-400">{formatDate(c.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
