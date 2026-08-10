import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getLeagueContext, getLeagueTeams } from "@/lib/data/league";
import { can } from "@/lib/permissions";
import { MEMBER_ROLE, ROLE_DESCRIPTIONS, label, type MemberRole } from "@/lib/domain/enums";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { removeMemberAction } from "@/lib/actions/members";
import { MemberForm } from "./member-form";

export const metadata: Metadata = { title: "Organização" };

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { league, access } = await getLeagueContext(slug);
  if (!can(access, "league.manage")) redirect(`/ligas/${league.slug}`);

  const [members, teams, owner] = await Promise.all([
    db.leagueMember.findMany({
      where: { leagueId: league.id },
      include: { user: true, church: true },
      orderBy: { createdAt: "asc" },
    }),
    getLeagueTeams(league.id),
    db.user.findUnique({ where: { id: league.ownerId } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Organização"
        description="Cadastre organizadores e defina o que cada um pode administrar."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Equipe de organização</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-zinc-100">
                {owner && (
                  <li className="flex items-center gap-3 py-3">
                    <Avatar name={owner.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">{owner.name}</p>
                      <p className="truncate text-xs text-zinc-400">{owner.email}</p>
                    </div>
                    <Badge tone="gold">Dono da liga</Badge>
                  </li>
                )}
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-3">
                    <Avatar name={m.user.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">{m.user.name}</p>
                      <p className="truncate text-xs text-zinc-400">{m.user.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone="green">{label(MEMBER_ROLE, m.role)}</Badge>
                      {m.church && (
                        <span className="text-[11px] text-zinc-400">{m.church.name}</span>
                      )}
                    </div>
                    <form action={removeMemberAction.bind(null, league.id, m.id)}>
                      <ConfirmButton
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-[11px] text-red-500 hover:bg-red-50"
                        message={`Remover o papel de ${m.user.name}?`}
                      >
                        Remover
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
                {members.length === 0 && (
                  <li className="py-3 text-sm text-zinc-400">
                    Nenhum organizador cadastrado além do dono.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adicionar organizador</CardTitle>
            </CardHeader>
            <CardContent>
              <MemberForm
                leagueId={league.id}
                teams={teams.map((t) => ({ churchId: t.churchId, name: t.church.name }))}
              />
            </CardContent>
          </Card>
        </div>

        {/* Referência de papéis */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Papéis e responsabilidades</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3.5">
              {(Object.keys(MEMBER_ROLE) as MemberRole[]).map((role) => (
                <div key={role}>
                  <dt className="text-sm font-semibold text-zinc-800">{MEMBER_ROLE[role]}</dt>
                  <dd className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                    {ROLE_DESCRIPTIONS[role]}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
