import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getLeagueContext, getLeagueTeams } from "@/lib/data/league";
import { can } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MatchForm } from "./match-form";

export const metadata: Metadata = { title: "Novo Jogo" };

export default async function NewMatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { league, access } = await getLeagueContext(slug);
  if (!can(access, "schedule.manage")) redirect(`/ligas/${league.slug}/jogos`);

  const [teams, venues, rounds] = await Promise.all([
    getLeagueTeams(league.id),
    db.venue.findMany({ where: { leagueId: league.id }, orderBy: { name: "asc" } }),
    db.round.findMany({ where: { leagueId: league.id }, orderBy: { number: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Novo Jogo" description="Crie uma partida avulsa na competição." />
      <Card>
        <CardContent className="pt-5">
          <MatchForm
            leagueId={league.id}
            teams={teams.map((t) => ({ id: t.id, name: t.church.name }))}
            venues={venues.map((v) => ({ id: v.id, name: v.name }))}
            rounds={rounds.map((r) => ({ id: r.id, name: r.name ?? `Rodada ${r.number}` }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
