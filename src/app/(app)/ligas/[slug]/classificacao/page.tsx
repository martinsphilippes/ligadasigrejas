import type { Metadata } from "next";
import { getLeagueContext } from "@/lib/data/league";
import { getStandings, getLeagueTopScorers } from "@/lib/data/standings";
import { parseTiebreakers } from "@/lib/domain/rules";
import { TIEBREAKER } from "@/lib/domain/enums";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StandingsTable } from "@/components/standings-table";

export const metadata: Metadata = { title: "Classificação" };

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { league } = await getLeagueContext(slug);
  const [standings, topScorers] = await Promise.all([
    getStandings(league.id),
    getLeagueTopScorers(league.id, 5),
  ]);
  const tiebreakers = parseTiebreakers(league.rules?.tiebreakers);

  return (
    <div>
      <PageHeader
        title="Classificação"
        description={`${standings.length} equipes · ${league.rules?.pointsWin ?? 3} pts por vitória, ${league.rules?.pointsDraw ?? 1} por empate`}
      />

      {standings.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="Nenhuma equipe inscrita"
          description="Inscreva as equipes na tela Equipes para montar a classificação."
        />
      ) : (
        <div className="space-y-6">
          <StandingsTable standings={standings} leagueSlug={league.slug} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Critérios de desempate</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-inside list-decimal space-y-1 text-sm text-zinc-600">
                  {tiebreakers.map((tb) => (
                    <li key={tb}>{TIEBREAKER[tb]}</li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-zinc-400">
                  Configuráveis na tela Regras. Legenda: P pontos, J jogos, V vitórias,
                  E empates, D derrotas, GP gols pró, GC gols contra, SG saldo, % aproveitamento.
                </p>
              </CardContent>
            </Card>

            {topScorers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>⚽ Artilharia</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2.5">
                    {topScorers.map((s, i) => (
                      <li key={s.athlete.id} className="flex items-center gap-3">
                        <span className="w-4 text-center text-xs font-bold text-zinc-400">
                          {i + 1}
                        </span>
                        <Avatar name={s.athlete.name} src={s.athlete.photoUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-800">
                            {s.athlete.name}
                          </p>
                          <p className="truncate text-xs text-zinc-400">
                            {s.athlete.church.name}
                          </p>
                        </div>
                        <span className="font-bold tabular-nums text-brand-800">
                          {s.goals} <span className="text-xs font-normal text-zinc-400">gols</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
