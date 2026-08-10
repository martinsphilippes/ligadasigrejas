import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getLeagueContext } from "@/lib/data/league";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { MatchCard } from "@/components/match-card";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Jogos" };

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "futuros", label: "Futuros" },
  { key: "realizados", label: "Realizados" },
] as const;

export default async function MatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { slug } = await params;
  const { filtro = "todos" } = await searchParams;
  const { league, access } = await getLeagueContext(slug);

  const where: Prisma.MatchWhereInput = { leagueId: league.id };
  if (filtro === "futuros") where.status = { in: ["AGENDADO", "EM_ANDAMENTO", "ADIADO"] };
  if (filtro === "realizados") where.status = { in: ["FINALIZADO", "WO", "CANCELADO"] };

  const matches = await db.match.findMany({
    where,
    include: {
      homeTeam: { include: { church: true } },
      awayTeam: { include: { church: true } },
      venue: true,
      round: true,
    },
    orderBy: [{ scheduledAt: filtro === "realizados" ? "desc" : "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Jogos"
        description="Calendário completo da competição."
        actions={
          can(access, "schedule.manage") && (
            <ButtonLink href={`/ligas/${league.slug}/jogos/novo`}>+ Novo jogo</ButtonLink>
          )
        }
      />

      {/* Filtros */}
      <div className="mb-5 flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/ligas/${league.slug}/jogos${f.key === "todos" ? "" : `?filtro=${f.key}`}`}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              filtro === f.key
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {matches.length === 0 ? (
        <EmptyState
          icon="⚽"
          title="Nenhum jogo encontrado"
          description="Gere a tabela na tela Rodadas ou crie jogos manualmente."
        />
      ) : (
        <div className="grid gap-2.5 xl:grid-cols-2">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} leagueSlug={league.slug} showRound />
          ))}
        </div>
      )}
    </div>
  );
}
