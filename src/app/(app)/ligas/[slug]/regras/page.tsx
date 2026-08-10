import type { Metadata } from "next";
import { getLeagueContext } from "@/lib/data/league";
import { can } from "@/lib/permissions";
import { parseTiebreakers } from "@/lib/domain/rules";
import { LEAGUE_FORMAT, TIEBREAKER, label } from "@/lib/domain/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RulesForm } from "./rules-form";

export const metadata: Metadata = { title: "Regras" };

export default async function RulesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { league, access } = await getLeagueContext(slug);
  const rules = league.rules;
  const tiebreakers = parseTiebreakers(rules?.tiebreakers);
  const manage = can(access, "league.manage");

  if (!manage) {
    // Visão somente leitura para quem não administra a liga
    return (
      <div>
        <PageHeader title="Regras" description="Regulamento e formato da competição." />
        <div className="grid gap-4 sm:grid-cols-2">
          <RuleCard title="Formato">
            <RuleRow label="Formato" value={label(LEAGUE_FORMAT, rules?.format ?? "PONTOS_CORRIDOS")} />
            <RuleRow label="Turnos" value={rules?.legs === 2 ? "Ida e volta" : `${rules?.legs ?? 1} turno(s)`} />
            <RuleRow label="Mata-mata" value={rules?.playoffLegs === 2 ? "Ida e volta" : "Jogo único"} />
            <RuleRow label="Repescagem" value={rules?.hasRepechage ? "Sim" : "Não"} />
          </RuleCard>
          <RuleCard title="Pontuação">
            <RuleRow label="Vitória" value={`${rules?.pointsWin ?? 3} pontos`} />
            <RuleRow label="Empate" value={`${rules?.pointsDraw ?? 1} ponto(s)`} />
            <RuleRow label="Derrota" value={`${rules?.pointsLoss ?? 0} ponto(s)`} />
          </RuleCard>
          <RuleCard title="Tempo de jogo">
            <RuleRow label="Duração" value={`${rules?.matchDuration ?? 40} min (${rules?.periods ?? 2} tempos)`} />
            <RuleRow label="Intervalo" value={`${rules?.intervalMinutes ?? 10} min`} />
            <RuleRow label="Prorrogação" value={rules?.extraTime ? `${rules.extraTime} min` : "Direto para pênaltis"} />
            <RuleRow label="Pênaltis" value={`${rules?.penaltiesCount ?? 5} cobranças alternadas`} />
          </RuleCard>
          <RuleCard title="Elenco e disciplina">
            <RuleRow label="Atletas por equipe" value={`${rules?.minAthletes ?? 7} a ${rules?.maxAthletes ?? 15}`} />
            <RuleRow label="Cartões amarelos" value={`${rules?.yellowLimit ?? 3} = suspensão`} />
            <RuleRow label="Cartão vermelho" value={`${rules?.redSuspension ?? 1} jogo(s) de suspensão`} />
          </RuleCard>
        </div>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Critérios de desempate</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-inside list-decimal space-y-1 text-sm text-zinc-600">
              {tiebreakers.map((tb) => (
                <li key={tb}>{TIEBREAKER[tb]}</li>
              ))}
            </ol>
            {rules?.notes && (
              <p className="mt-4 whitespace-pre-line border-t border-zinc-100 pt-3 text-sm text-zinc-600">
                {rules.notes}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Regras"
        description="Configure o formato do campeonato sem alterar código. A classificação e a geração de tabela obedecem a estas regras."
      />
      <RulesForm
        leagueId={league.id}
        initial={{
          format: rules?.format ?? "PONTOS_CORRIDOS",
          pointsWin: rules?.pointsWin ?? 3,
          pointsDraw: rules?.pointsDraw ?? 1,
          pointsLoss: rules?.pointsLoss ?? 0,
          legs: rules?.legs ?? 1,
          playoffLegs: rules?.playoffLegs ?? 1,
          hasRepechage: rules?.hasRepechage ?? false,
          matchDuration: rules?.matchDuration ?? 40,
          periods: rules?.periods ?? 2,
          intervalMinutes: rules?.intervalMinutes ?? 10,
          extraTime: rules?.extraTime ?? 10,
          penaltiesCount: rules?.penaltiesCount ?? 5,
          maxAthletes: rules?.maxAthletes ?? 15,
          minAthletes: rules?.minAthletes ?? 7,
          yellowLimit: rules?.yellowLimit ?? 3,
          redSuspension: rules?.redSuspension ?? 1,
          notes: rules?.notes ?? "",
          tiebreakers,
        }}
      />
    </div>
  );
}

function RuleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">{children}</dl>
      </CardContent>
    </Card>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="text-right font-medium text-zinc-700">{value}</dd>
    </div>
  );
}
