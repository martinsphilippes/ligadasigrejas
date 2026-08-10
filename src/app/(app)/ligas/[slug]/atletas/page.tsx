import type { Metadata } from "next";
import Link from "next/link";
import { getLeagueContext, getLeagueTeams } from "@/lib/data/league";
import { db } from "@/lib/db";
import { calcAge, cn } from "@/lib/utils";
import { label, POSITIONS_BY_SPORT, SQUAD_ROLE } from "@/lib/domain/enums";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Atletas" };

export default async function AthletesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ equipe?: string }>;
}) {
  const { slug } = await params;
  const { equipe } = await searchParams;
  const { league } = await getLeagueContext(slug);
  const teams = await getLeagueTeams(league.id);

  const filtered = equipe ? teams.filter((t) => t.id === equipe) : teams;
  const athletes = await db.athlete.findMany({
    where: {
      active: true,
      churchId: { in: filtered.map((t) => t.churchId) },
    },
    include: { church: { select: { id: true, name: true, crestUrl: true } } },
    orderBy: [{ name: "asc" }],
  });

  const positions = POSITIONS_BY_SPORT[league.sport.slug] ?? {};

  return (
    <div>
      <PageHeader
        title="Atletas"
        description={`${athletes.length} atletas nas equipes da liga.`}
      />

      {/* Filtro por equipe */}
      {teams.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <FilterChip href={`/ligas/${league.slug}/atletas`} active={!equipe}>
            Todas
          </FilterChip>
          {teams.map((t) => (
            <FilterChip
              key={t.id}
              href={`/ligas/${league.slug}/atletas?equipe=${t.id}`}
              active={equipe === t.id}
            >
              {t.church.name}
            </FilterChip>
          ))}
        </div>
      )}

      {athletes.length === 0 ? (
        <EmptyState
          icon="👟"
          title="Nenhum atleta encontrado"
          description="Cadastre atletas nas fichas das igrejas participantes."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                <th className="py-2.5 pl-4 pr-2">Atleta</th>
                <th className="px-2 py-2.5">Equipe</th>
                <th className="px-2 py-2.5 text-center">Camisa</th>
                <th className="px-2 py-2.5">Posição</th>
                <th className="px-2 py-2.5 text-center">Idade</th>
                <th className="py-2.5 pl-2 pr-4">Condição</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => {
                const age = calcAge(a.birthDate);
                return (
                  <tr
                    key={a.id}
                    className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/70"
                  >
                    <td className="py-2.5 pl-4 pr-2">
                      <Link
                        href={`/igrejas/${a.church.id}/atletas/${a.id}/editar`}
                        className="flex items-center gap-2.5 font-medium text-zinc-800 hover:text-brand-800"
                      >
                        <Avatar name={a.name} src={a.photoUrl} size="xs" />
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="flex items-center gap-2 text-zinc-600">
                        <Avatar name={a.church.name} src={a.church.crestUrl} shape="shield" size="xs" />
                        {a.church.name}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-zinc-500">
                      {a.shirtNumber ?? "—"}
                    </td>
                    <td className="px-2 py-2.5 text-zinc-600">
                      {label(positions, a.position, "—")}
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-zinc-500">
                      {age ?? "—"}
                    </td>
                    <td className="py-2.5 pl-2 pr-4">
                      <Badge tone={a.squadRole === "TITULAR" ? "green" : "neutral"}>
                        {label(SQUAD_ROLE, a.squadRole)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-brand-700 bg-brand-700 text-white"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900",
      )}
    >
      {children}
    </Link>
  );
}
