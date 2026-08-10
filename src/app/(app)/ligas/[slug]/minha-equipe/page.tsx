import type { Metadata } from "next";
import { getLeagueContext, getMyTeam, getLeagueTeams } from "@/lib/data/league";
import { canForChurch } from "@/lib/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { TeamView } from "@/components/team-view";

export const metadata: Metadata = { title: "Minha Equipe" };

export default async function MyTeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { league, user, access } = await getLeagueContext(slug);

  // Equipe vinculada ao usuário via papel na organização; se o usuário for o
  // dono/organizador sem vínculo e a liga tiver uma única equipe, mostra ela.
  let team = await getMyTeam(league.id, user.sub);
  if (!team) {
    const teams = await getLeagueTeams(league.id);
    if (teams.length === 1 && access.isOwner) {
      team = { ...teams[0], church: teams[0].church };
    }
  }

  if (!team) {
    return (
      <EmptyState
        icon="⭐"
        title="Você ainda não está vinculado a uma equipe"
        description="Peça ao organizador da liga para vincular seu usuário a uma igreja na tela Organização (papel Administrador da Equipe ou Organizador da Igreja)."
        action={
          access.isOwner ? (
            <ButtonLink href={`/ligas/${league.slug}/organizacao`}>
              Ir para Organização
            </ButtonLink>
          ) : undefined
        }
      />
    );
  }

  return (
    <TeamView
      leagueId={league.id}
      leagueSlug={league.slug}
      teamId={team.id}
      canManageSquad={canForChurch(access, "squad.manage", team.churchId)}
    />
  );
}
