"use client";

import { useActionState } from "react";
import { rescheduleMatchAction } from "@/lib/actions/schedule";
import type { ActionState } from "@/lib/actions/league";
import { Field, Input, Select } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

interface Option {
  id: string;
  name: string;
}

function toLocalInput(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function RescheduleForm({
  leagueId,
  matchId,
  initial,
  venues,
  rounds,
}: {
  leagueId: string;
  matchId: string;
  initial: { scheduledAt: Date | null; venueId: string | null; roundId: string | null };
  venues: Option[];
  rounds: Option[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    rescheduleMatchAction.bind(null, leagueId, matchId),
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <Field label="Data e horário">
        <Input
          name="scheduledAt"
          type="datetime-local"
          defaultValue={toLocalInput(initial.scheduledAt)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quadra">
          <Select name="venueId" defaultValue={initial.venueId ?? ""}>
            <option value="">A definir</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Rodada">
          <Select name="roundId" defaultValue={initial.roundId ?? ""}>
            <option value="">Sem rodada</option>
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <SubmitButton variant="secondary" size="sm" pendingText="Salvando...">
        Salvar agendamento
      </SubmitButton>
    </form>
  );
}
