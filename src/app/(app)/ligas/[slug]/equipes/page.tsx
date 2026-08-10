import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getLeagueContext, getLeagueTeams } from "@/lib/data/league";
import { can } from "@/lib/permissions";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { removeTeamAction, setTeamGroupAction } from "@/lib/actions/schedule";
import { EnrollForm } from "./enroll-form";

const GROUP_OPTIONS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export const metadata: Metadata = { title: "Equipes" };

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { league, access } = await getLeagueContext(slug);
  const manage = can(access, "teams.manage");
  const usesGroups =
    league.rules?.format === "GRUPOS" || league.rules?.format === "GRUPOS_MATA_MATA";

  const [teams, allChurches] = await Promise.all([
    getLeagueTeams(league.id),
    manage ? db.church.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  const enrolledIds = new Set(teams.map((t) => t.churchId));
  const available = allChurches.filter((c) => !enrolledIds.has(c.id));

  return (
    <div>
      <PageHeader
        title="Equipes"
        description={`${teams.length} equipes inscritas na liga.`}
      />

      {manage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Inscrever equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <EnrollForm
              leagueId={league.id}
              churches={available.map((c) => ({
                id: c.id,
                name: `${c.name} (${c.city}/${c.state})`,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {teams.length === 0 ? (
        <EmptyState
          icon="🛡"
          title="Nenhuma equipe inscrita"
          description={
            manage
              ? "Inscreva as igrejas cadastradas para formarem as equipes da liga."
              : "As equipes ainda não foram inscritas pela organização."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card
              key={team.id}
              className="p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md animate-fade-up"
            >
              <Link
                href={`/ligas/${league.slug}/equipes/${team.id}`}
                className="flex items-center gap-3"
              >
                <Avatar
                  name={team.church.name}
                  src={team.church.crestUrl}
                  shape="shield"
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-zinc-900">
                    {team.church.name}
                  </h3>
                  <p className="truncate text-xs text-zinc-500">
                    {team.church.denomination} · {team.church.city}/{team.church.state}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {team.church._count.athletes} atletas
                    {team.group && ` · Grupo ${team.group}`}
                  </p>
                </div>
              </Link>
              {manage && (
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                  {usesGroups ? (
                    <form
                      action={setTeamGroupAction.bind(null, league.id, team.id)}
                      className="flex items-center gap-1.5"
                    >
                      <label className="text-[11px] font-medium text-zinc-400">Grupo</label>
                      <select
                        name="group"
                        defaultValue={team.group ?? ""}
                        className="rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700"
                      >
                        <option value="">—</option>
                        {GROUP_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
                      >
                        OK
                      </button>
                    </form>
                  ) : (
                    <span />
                  )}
                  <form action={removeTeamAction.bind(null, league.id, team.id)}>
                    <ConfirmButton
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-[11px] text-red-500 hover:bg-red-50"
                      message={`Remover ${team.church.name} da liga? Os jogos desta equipe serão excluídos.`}
                    >
                      Remover da liga
                    </ConfirmButton>
                  </form>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
