import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getLeagueContext } from "@/lib/data/league";
import { canForChurch } from "@/lib/permissions";
import { TeamView } from "@/components/team-view";

export const metadata: Metadata = { title: "Equipe" };

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string; teamId: string }>;
}) {
  const { slug, teamId } = await params;
  const { league, access } = await getLeagueContext(slug);

  const team = await db.leagueTeam.findUnique({ where: { id: teamId } });
  if (!team || team.leagueId !== league.id) notFound();

  return (
    <TeamView
      leagueId={league.id}
      leagueSlug={league.slug}
      teamId={teamId}
      canManageSquad={canForChurch(access, "squad.manage", team.churchId)}
    />
  );
}
