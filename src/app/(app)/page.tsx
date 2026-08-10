import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getPlatformRole, isPlatformOrganizer } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { LeagueStatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ uf?: string }>;
}) {
  const { uf } = await searchParams;
  const user = await requireUser();
  const organizer = isPlatformOrganizer(await getPlatformRole(user.sub));

  const allLeagues = await db.league.findMany({
    include: {
      sport: true,
      _count: { select: { teams: true, matches: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Regiões (UFs) com campeonatos, para o filtro
  const regions = [...new Set(allLeagues.flatMap((l) => (l.state ? [l.state] : [])))].sort();
  const leagues = uf ? allLeagues.filter((l) => l.state === uf) : allLeagues;

  const memberOf = new Set(
    (
      await db.leagueMember.findMany({
        where: { userId: user.sub },
        select: { leagueId: true },
      })
    ).map((m) => m.leagueId),
  );

  const mine = leagues.filter((l) => l.ownerId === user.sub || memberOf.has(l.id));
  const others = leagues.filter((l) => !mine.includes(l));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Minhas Ligas"
        description="Campeonatos que você organiza ou participa."
        actions={organizer && <ButtonLink href="/ligas/nova">+ Nova Liga</ButtonLink>}
      />

      {/* Campeonatos por região */}
      {regions.length > 1 && (
        <div className="mb-5 flex flex-wrap items-center gap-1.5 animate-fade-in">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            📍 Região:
          </span>
          <RegionChip href="/" active={!uf}>
            Todas
          </RegionChip>
          {regions.map((region) => (
            <RegionChip key={region} href={`/?uf=${region}`} active={uf === region}>
              {region}
            </RegionChip>
          ))}
        </div>
      )}

      {mine.length === 0 ? (
        organizer ? (
          <EmptyState
            icon="🏆"
            title="Você ainda não tem nenhuma liga"
            description="Crie sua primeira liga e comece a organizar o campeonato entre as igrejas."
            action={<ButtonLink href="/ligas/nova">Criar minha primeira liga</ButtonLink>}
          />
        ) : (
          <EmptyState
            icon="⛪"
            title="Você ainda não participa de nenhuma liga"
            description="Peça ao organizador do campeonato para vincular você à equipe da sua igreja. Enquanto isso, você pode acompanhar as ligas abertas abaixo."
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((league) => (
            <LeagueCard key={league.id} league={league} />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <>
          <h2 className="mb-4 mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Outras ligas na plataforma
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

function RegionChip({
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
      className={
        active
          ? "rounded-full border border-brand-700 bg-brand-700 px-3 py-1 text-xs font-medium text-white"
          : "rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
      }
    >
      {children}
    </Link>
  );
}

function LeagueCard({
  league,
}: {
  league: {
    slug: string;
    name: string;
    season: string;
    city: string | null;
    state: string | null;
    status: string;
    logoUrl: string | null;
    startDate: Date | null;
    sport: { name: string };
    _count: { teams: number; matches: number };
  };
}) {
  return (
    <Link href={`/ligas/${league.slug}`} className="group">
      <Card className="h-full p-5 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-brand-300 group-hover:shadow-md group-active:scale-[0.97] group-active:border-brand-500 group-active:bg-brand-50/50 animate-fade-up">
        <div className="flex items-start justify-between gap-3">
          <Avatar name={league.name} src={league.logoUrl} shape="shield" size="lg" />
          <LeagueStatusBadge status={league.status} />
        </div>
        <h3 className="mt-4 font-bold tracking-tight text-zinc-900 group-hover:text-brand-800">
          {league.name}
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          {league.sport.name} · Temporada {league.season}
          {league.city && ` · ${league.city}${league.state ? `/${league.state}` : ""}`}
        </p>
        <div className="mt-4 flex items-center gap-4 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
          <span>
            <strong className="text-zinc-800">{league._count.teams}</strong> equipes
          </span>
          <span>
            <strong className="text-zinc-800">{league._count.matches}</strong> jogos
          </span>
          {league.startDate && <span className="ml-auto">{formatDate(league.startDate)}</span>}
        </div>
      </Card>
    </Link>
  );
}
