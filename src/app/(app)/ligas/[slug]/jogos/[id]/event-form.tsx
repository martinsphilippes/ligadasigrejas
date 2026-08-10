"use client";

import { useActionState, useState } from "react";
import { addMatchEventAction } from "@/lib/actions/schedule";
import type { ActionState } from "@/lib/actions/league";
import { EVENT_TYPE } from "@/lib/domain/enums";
import { Field, Input, Select } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

interface TeamOption {
  id: string;
  name: string;
  athletes: { id: string; name: string }[];
}

/** Registro de gols e cartões, com lista de atletas da equipe selecionada. */
export function EventForm({
  leagueId,
  matchId,
  teams,
}: {
  leagueId: string;
  matchId: string;
  teams: TeamOption[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    addMatchEventAction.bind(null, leagueId, matchId),
    {},
  );
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const athletes = teams.find((t) => t.id === teamId)?.athletes ?? [];

  return (
    <form action={action} className="space-y-3 border-t border-zinc-100 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Registrar evento
      </p>
      <FormError message={state.error} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Equipe">
          <Select name="teamId" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo">
          <Select name="type" defaultValue="GOL">
            {Object.entries(EVENT_TYPE).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_90px] gap-3">
        <Field label="Atleta">
          <Select name="athleteId" defaultValue="">
            <option value="">Não informado</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Minuto">
          <Input name="minute" type="number" min={0} max={200} placeholder="12" />
        </Field>
      </div>
      <SubmitButton variant="secondary" size="sm" pendingText="Registrando...">
        Adicionar evento
      </SubmitButton>
    </form>
  );
}
