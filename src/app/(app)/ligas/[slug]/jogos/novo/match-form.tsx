"use client";

import { useActionState } from "react";
import { createMatchAction } from "@/lib/actions/schedule";
import type { ActionState } from "@/lib/actions/league";
import { Field, Input, Select } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

interface Option {
  id: string;
  name: string;
}

export function MatchForm({
  leagueId,
  teams,
  venues,
  rounds,
}: {
  leagueId: string;
  teams: Option[];
  venues: Option[];
  rounds: Option[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    createMatchAction.bind(null, leagueId),
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mandante">
          <Select name="homeTeamId" required defaultValue="">
            <option value="" disabled>
              Selecione...
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Visitante">
          <Select name="awayTeamId" required defaultValue="">
            <option value="" disabled>
              Selecione...
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data e horário">
          <Input name="scheduledAt" type="datetime-local" />
        </Field>
        <Field label="Quadra">
          <Select name="venueId" defaultValue="">
            <option value="">A definir</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Rodada">
        <Select name="roundId" defaultValue="">
          <option value="">Sem rodada</option>
          {rounds.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end pt-2">
        <SubmitButton pendingText="Criando...">Criar jogo</SubmitButton>
      </div>
    </form>
  );
}
