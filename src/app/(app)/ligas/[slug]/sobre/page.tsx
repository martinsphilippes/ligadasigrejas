import type { Metadata } from "next";
import { getLeagueContext } from "@/lib/data/league";
import { can, getPlatformRole } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { deleteLeagueAction } from "@/lib/actions/league";
import { AboutForm, LeagueSettingsForm } from "./about-form";

export const metadata: Metadata = { title: "Sobre" };

export default async function AboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { league, user, access } = await getLeagueContext(slug);
  const manage = can(access, "league.manage");
  const canDelete =
    access.isOwner || (await getPlatformRole(user.sub)) === "ADMIN";

  return (
    <div>
      <PageHeader title="Sobre a liga" description="História, organização e contato." />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{league.name} · Temporada {league.season}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-zinc-600">
            {league.description && <p className="whitespace-pre-line">{league.description}</p>}
            <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
              {league.city && (
                <span>📍 {league.city}{league.state ? `/${league.state}` : ""}</span>
              )}
              {league.startDate && <span>Início: {formatDate(league.startDate)}</span>}
              {league.endDate && <span>Término: {formatDate(league.endDate)}</span>}
              <span>Modalidade: {league.sport.name}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Section title="📜 História" content={league.history} empty="A história da liga ainda não foi escrita." />
          <Section title="👥 Organizadores" content={league.organizers} empty="Os organizadores ainda não foram informados." />
          <Section title="✉️ Contato" content={league.contact} empty="Nenhuma informação de contato." />
        </div>

        {manage && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Editar história, organizadores e contato</CardTitle>
              </CardHeader>
              <CardContent>
                <AboutForm
                  leagueId={league.id}
                  initial={{
                    history: league.history ?? "",
                    organizers: league.organizers ?? "",
                    contact: league.contact ?? "",
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dados da liga</CardTitle>
              </CardHeader>
              <CardContent>
                <LeagueSettingsForm
                  leagueId={league.id}
                  initial={{
                    name: league.name,
                    season: league.season,
                    description: league.description ?? "",
                    city: league.city ?? "",
                    state: league.state ?? "",
                    logoUrl: league.logoUrl ?? "",
                    bannerUrl: league.bannerUrl ?? "",
                    startDate: league.startDate,
                    endDate: league.endDate,
                    status: league.status,
                  }}
                />
              </CardContent>
            </Card>
          </>
        )}

        {canDelete && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700">Zona de perigo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">
                Excluir a liga apaga equipes inscritas, rodadas, jogos, resultados,
                quadras e avisos. As igrejas e seus atletas permanecem cadastrados.
              </p>
              <form action={deleteLeagueAction.bind(null, league.id)}>
                <ConfirmButton
                  variant="danger"
                  size="sm"
                  message={`Excluir a liga ${league.name} definitivamente? Esta ação não pode ser desfeita.`}
                >
                  Excluir liga
                </ConfirmButton>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  content,
  empty,
}: {
  title: string;
  content: string | null;
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {content ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">{content}</p>
        ) : (
          <p className="text-sm text-zinc-400">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}
