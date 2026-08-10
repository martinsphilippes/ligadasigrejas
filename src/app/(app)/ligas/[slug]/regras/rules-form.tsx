"use client";

import { useActionState, useState } from "react";
import { updateRulesAction } from "@/lib/actions/rules";
import type { ActionState } from "@/lib/actions/league";
import { LEAGUE_FORMAT, TIEBREAKER, type Tiebreaker } from "@/lib/domain/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

interface RulesData {
  format: string;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  legs: number;
  playoffLegs: number;
  hasRepechage: boolean;
  matchDuration: number;
  periods: number;
  intervalMinutes: number;
  extraTime: number;
  penaltiesCount: number;
  maxAthletes: number;
  minAthletes: number;
  yellowLimit: number;
  redSuspension: number;
  notes: string;
  tiebreakers: Tiebreaker[];
}

export function RulesForm({
  leagueId,
  initial,
}: {
  leagueId: string;
  initial: RulesData;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateRulesAction.bind(null, leagueId),
    {},
  );
  const [tiebreakers, setTiebreakers] = useState<Tiebreaker[]>(initial.tiebreakers);

  const allKeys = Object.keys(TIEBREAKER) as Tiebreaker[];
  const unused = allKeys.filter((k) => !tiebreakers.includes(k));

  function move(index: number, dir: -1 | 1) {
    const next = [...tiebreakers];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setTiebreakers(next);
  }

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Formato */}
        <Card>
          <CardHeader>
            <CardTitle>Formato do campeonato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Formato">
              <Select name="format" defaultValue={initial.format}>
                {Object.entries(LEAGUE_FORMAT).map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Turnos" hint="2 = ida e volta">
                <Input name="legs" type="number" min={1} max={4} defaultValue={initial.legs} />
              </Field>
              <Field label="Mata-mata" hint="jogos por confronto">
                <Select name="playoffLegs" defaultValue={String(initial.playoffLegs)}>
                  <option value="1">Jogo único</option>
                  <option value="2">Ida e volta</option>
                </Select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="hasRepechage"
                defaultChecked={initial.hasRepechage}
                className="size-4 accent-brand-700"
              />
              Com repescagem
            </label>
          </CardContent>
        </Card>

        {/* Pontuação */}
        <Card>
          <CardHeader>
            <CardTitle>Pontuação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Vitória">
                <Input name="pointsWin" type="number" min={0} max={10} defaultValue={initial.pointsWin} />
              </Field>
              <Field label="Empate">
                <Input name="pointsDraw" type="number" min={0} max={10} defaultValue={initial.pointsDraw} />
              </Field>
              <Field label="Derrota">
                <Input name="pointsLoss" type="number" min={0} max={10} defaultValue={initial.pointsLoss} />
              </Field>
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Alterar a pontuação recalcula a classificação imediatamente.
            </p>
          </CardContent>
        </Card>

        {/* Tempo de jogo */}
        <Card>
          <CardHeader>
            <CardTitle>Tempo de jogo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Duração total (min)">
                <Input name="matchDuration" type="number" min={1} max={120} defaultValue={initial.matchDuration} />
              </Field>
              <Field label="Tempos">
                <Input name="periods" type="number" min={1} max={4} defaultValue={initial.periods} />
              </Field>
              <Field label="Intervalo (min)">
                <Input name="intervalMinutes" type="number" min={0} max={60} defaultValue={initial.intervalMinutes} />
              </Field>
              <Field label="Prorrogação (min)" hint="0 = direto pênaltis">
                <Input name="extraTime" type="number" min={0} max={60} defaultValue={initial.extraTime} />
              </Field>
              <Field label="Pênaltis (cobranças)">
                <Input name="penaltiesCount" type="number" min={1} max={10} defaultValue={initial.penaltiesCount} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Elenco e disciplina */}
        <Card>
          <CardHeader>
            <CardTitle>Elenco e disciplina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Mínimo de atletas">
                <Input name="minAthletes" type="number" min={2} max={30} defaultValue={initial.minAthletes} />
              </Field>
              <Field label="Máximo de atletas">
                <Input name="maxAthletes" type="number" min={5} max={30} defaultValue={initial.maxAthletes} />
              </Field>
              <Field label="Amarelos p/ suspensão">
                <Input name="yellowLimit" type="number" min={1} max={10} defaultValue={initial.yellowLimit} />
              </Field>
              <Field label="Suspensão por vermelho" hint="jogos">
                <Input name="redSuspension" type="number" min={0} max={10} defaultValue={initial.redSuspension} />
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critérios de desempate */}
      <Card>
        <CardHeader>
          <CardTitle>Critérios de desempate (em ordem)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="space-y-1.5">
            {tiebreakers.map((tb, i) => (
              <li
                key={tb}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2"
              >
                <input type="hidden" name={`tiebreaker-${i}`} value={tb} />
                <span className="w-5 text-center text-xs font-bold text-zinc-400">{i + 1}º</span>
                <span className="flex-1 text-sm font-medium text-zinc-800">{TIEBREAKER[tb]}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"
                    aria-label="Subir critério"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === tiebreakers.length - 1}
                    className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"
                    aria-label="Descer critério"
                  >
                    ↓
                  </button>
                  {tb !== "PONTOS" && (
                    <button
                      type="button"
                      onClick={() => setTiebreakers(tiebreakers.filter((t) => t !== tb))}
                      className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                      aria-label="Remover critério"
                    >
                      ×
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {unused.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
              <span className="text-xs text-zinc-400">Adicionar:</span>
              {unused.map((tb) => (
                <button
                  key={tb}
                  type="button"
                  onClick={() => setTiebreakers([...tiebreakers, tb])}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-brand-300 hover:text-brand-800"
                >
                  + {TIEBREAKER[tb]}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observações do regulamento */}
      <Card>
        <CardHeader>
          <CardTitle>Observações do regulamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="notes"
            defaultValue={initial.notes}
            placeholder="Regras adicionais: uniforme, documentação exigida, tolerância de atraso para W.O., etc."
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton size="lg" pendingText="Salvando regras...">
          Salvar regras
        </SubmitButton>
      </div>
    </form>
  );
}
