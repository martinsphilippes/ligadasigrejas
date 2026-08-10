import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getLeagueContext } from "@/lib/data/league";
import { can } from "@/lib/permissions";
import { ROUND_PHASE, label } from "@/lib/domain/enums";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { MatchCard } from "@/components/match-card";
import { clearFixturesAction } from "@/lib/actions/schedule";
import { GenerateFixturesButton } from "./generate-fixtures";

export const metadata: Metadata = { title: "Rodadas" };

export default async function RoundsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { league, access } = await getLeagueContext(slug);
  const manage = can(access, "schedule.manage");

  const rounds = await db.round.findMany({
    where: { leagueId: league.id },
    include: {
      matches: {
        include: {
          homeTeam: { include: { church: true } },
          awayTeam: { include: { church: true } },
          venue: true,
          round: true,
        },
        orderBy: { scheduledAt: "asc" },
      },
    },
    orderBy: { number: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Rodadas"
        description={`${rounds.length} rodadas na competição.`}
        actions={
          manage && (
            <>
              {rounds.length > 0 && (
                <form action={clearFixturesAction.bind(null, league.id)}>
                  <ConfirmButton
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                    message="Excluir TODAS as rodadas e jogos da liga? Resultados registrados serão perdidos."
                  >
                    Limpar tabela
                  </ConfirmButton>
                </form>
              )}
              <GenerateFixturesButton leagueId={league.id} />
            </>
          )
        }
      />

      {rounds.length === 0 ? (
        <EmptyState
          icon="🗓"
          title="Nenhuma rodada criada"
          description={
            manage
              ? "Gere a tabela automaticamente a partir das equipes inscritas e das regras da liga (turnos configuráveis)."
              : "A organização ainda não gerou a tabela da competição."
          }
          action={manage && <GenerateFixturesButton leagueId={league.id} />}
        />
      ) : (
        <div className="space-y-8">
          {rounds.map((round) => {
            const done = round.matches.every(
              (m) => m.status === "FINALIZADO" || m.status === "WO" || m.status === "CANCELADO",
            );
            return (
              <section key={round.id}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-700">
                    {round.name ?? `Rodada ${round.number}`}
                  </h2>
                  {round.phase !== "PONTOS_CORRIDOS" && (
                    <Badge tone="gold">{label(ROUND_PHASE, round.phase)}</Badge>
                  )}
                  {done && round.matches.length > 0 && <Badge tone="green">Concluída</Badge>}
                </div>
                {round.matches.length === 0 ? (
                  <p className="text-sm text-zinc-400">Sem jogos nesta rodada.</p>
                ) : (
                  <div className="grid gap-2.5 xl:grid-cols-2">
                    {round.matches.map((m) => (
                      <MatchCard key={m.id} match={m} leagueSlug={league.slug} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
