import { getLeagueContext } from "@/lib/data/league";
import { can } from "@/lib/permissions";
import { Avatar } from "@/components/ui/avatar";
import { LeagueStatusBadge } from "@/components/ui/badge";
import { LeagueNav } from "@/components/layout/league-nav";

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { league, access } = await getLeagueContext(slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Cabeçalho da liga */}
      <div
        className="relative mb-6 overflow-hidden rounded-2xl bg-brand-950 p-6 text-white animate-fade-in"
        style={
          league.bannerUrl
            ? {
                backgroundImage: `linear-gradient(to right, rgba(10,37,26,0.92), rgba(10,37,26,0.65)), url(${league.bannerUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background:
                  "radial-gradient(600px circle at 90% -20%, rgba(234,176,48,0.25), transparent 55%), #0a251a",
              }
        }
      >
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={league.name} src={league.logoUrl} shape="shield" size="xl" className="ring-2 ring-white/20" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{league.name}</h1>
              <LeagueStatusBadge status={league.status} />
            </div>
            <p className="mt-1 text-sm text-brand-200">
              {league.sport.name} · Temporada {league.season}
              {league.city && ` · ${league.city}${league.state ? `/${league.state}` : ""}`}
            </p>
          </div>
        </div>
      </div>

      {/* Navegação + conteúdo */}
      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-8">
        <aside className="mb-4 lg:mb-0">
          <div
            className="lg:sticky"
            style={{ top: "calc(env(safe-area-inset-top) + 5rem)" }}
          >
            <LeagueNav slug={league.slug} canManage={can(access, "league.manage")} />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
