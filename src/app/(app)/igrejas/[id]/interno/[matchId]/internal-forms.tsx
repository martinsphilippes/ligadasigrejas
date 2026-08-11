"use client";

import { useActionState, useState } from "react";
import {
  recordInternalResultAction,
  addInternalEventAction,
} from "@/lib/actions/internal";
import type { ActionState } from "@/lib/actions/league";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

function toLocalInput(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function InternalResultForm({
  matchId,
  teamAName,
  teamBName,
  initial,
}: {
  matchId: string;
  teamAName: string;
  teamBName: string;
  initial: {
    status: string;
    scoreA: number | null;
    scoreB: number | null;
    scheduledAt: Date | null;
    location: string | null;
    notes: string | null;
  };
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    recordInternalResultAction.bind(null, matchId),
    {},
  );
  const [status, setStatus] = useState(initial.status);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <Field label="Situação">
        <Select name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="AGENDADO">Agendado</option>
          <option value="FINALIZADO">Finalizado</option>
          <option value="CANCELADO">Cancelado</option>
        </Select>
      </Field>
      {status === "FINALIZADO" && (
        <div className="grid grid-cols-2 gap-4">
          <Field label={teamAName}>
            <Input
              name="scoreA"
              type="number"
              min={0}
              max={99}
              defaultValue={initial.scoreA ?? ""}
              placeholder="0"
              className="text-center text-lg font-bold"
            />
          </Field>
          <Field label={teamBName}>
            <Input
              name="scoreB"
              type="number"
              min={0}
              max={99}
              defaultValue={initial.scoreB ?? ""}
              placeholder="0"
              className="text-center text-lg font-bold"
            />
          </Field>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data e horário">
          <Input
            name="scheduledAt"
            type="datetime-local"
            defaultValue={toLocalInput(initial.scheduledAt)}
          />
        </Field>
        <Field label="Local">
          <Input name="location" defaultValue={initial.location ?? ""} maxLength={120} />
        </Field>
      </div>
      <Field label="Observações">
        <Textarea name="notes" defaultValue={initial.notes ?? ""} className="min-h-14" maxLength={500} />
      </Field>
      <SubmitButton className="w-full" pendingText="Salvando...">
        Salvar
      </SubmitButton>
    </form>
  );
}

export function InternalEventForm({
  matchId,
  lineup,
  highlightsLeft,
}: {
  matchId: string;
  lineup: { id: string; name: string }[];
  highlightsLeft: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    addInternalEventAction.bind(null, matchId),
    {},
  );

  return (
    <form action={action} className="space-y-3 border-t border-zinc-100 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Registrar gol ou destaque
      </p>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <Select name="athleteId" required defaultValue="">
          <option value="" disabled>
            Atleta escalado...
          </option>
          {lineup.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select name="type" defaultValue="GOL" className="w-40">
          <option value="GOL">⚽ Gol</option>
          <option value="ASSISTENCIA">🅰️ Assistência</option>
          <option value="DESTAQUE" disabled={highlightsLeft <= 0}>
            ⭐ Destaque {highlightsLeft <= 0 ? "(3/3)" : ""}
          </option>
        </Select>
        <SubmitButton variant="secondary" size="md" pendingText="...">
          Adicionar
        </SubmitButton>
      </div>
    </form>
  );
}
