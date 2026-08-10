"use client";

import { useActionState, useState } from "react";
import { recordResultAction } from "@/lib/actions/schedule";
import type { ActionState } from "@/lib/actions/league";
import { MATCH_STATUS } from "@/lib/domain/enums";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

interface Team {
  id: string;
  name: string;
}

export function ResultForm({
  leagueId,
  matchId,
  initial,
  homeTeam,
  awayTeam,
}: {
  leagueId: string;
  matchId: string;
  initial: {
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    homePenalties: number | null;
    awayPenalties: number | null;
    woWinnerId: string | null;
    notes: string | null;
  };
  homeTeam: Team;
  awayTeam: Team;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    recordResultAction.bind(null, leagueId, matchId),
    {},
  );
  const [status, setStatus] = useState(initial.status);
  const [showPenalties, setShowPenalties] = useState(
    initial.homePenalties != null || initial.awayPenalties != null,
  );

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <Field label="Situação da partida">
        <Select name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(MATCH_STATUS).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </Select>
      </Field>

      {(status === "FINALIZADO" || status === "EM_ANDAMENTO") && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label={homeTeam.name}>
              <Input
                name="homeScore"
                type="number"
                min={0}
                defaultValue={initial.homeScore ?? ""}
                placeholder="0"
                className="text-center text-lg font-bold"
              />
            </Field>
            <Field label={awayTeam.name}>
              <Input
                name="awayScore"
                type="number"
                min={0}
                defaultValue={initial.awayScore ?? ""}
                placeholder="0"
                className="text-center text-lg font-bold"
              />
            </Field>
          </div>

          {!showPenalties ? (
            <button
              type="button"
              onClick={() => setShowPenalties(true)}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              + Registrar disputa de pênaltis (mata-mata)
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Pênaltis (mandante)">
                <Input
                  name="homePenalties"
                  type="number"
                  min={0}
                  defaultValue={initial.homePenalties ?? ""}
                  placeholder="0"
                  className="text-center"
                />
              </Field>
              <Field label="Pênaltis (visitante)">
                <Input
                  name="awayPenalties"
                  type="number"
                  min={0}
                  defaultValue={initial.awayPenalties ?? ""}
                  placeholder="0"
                  className="text-center"
                />
              </Field>
            </div>
          )}
        </>
      )}

      {status === "WO" && (
        <Field label="Equipe vencedora do W.O.">
          <Select name="woWinnerId" defaultValue={initial.woWinnerId ?? ""} required>
            <option value="" disabled>
              Selecione...
            </option>
            <option value={homeTeam.id}>{homeTeam.name}</option>
            <option value={awayTeam.id}>{awayTeam.name}</option>
          </Select>
        </Field>
      )}

      <Field label="Observações">
        <Textarea
          name="notes"
          defaultValue={initial.notes ?? ""}
          placeholder="Ocorrências, motivo de adiamento/cancelamento..."
          className="min-h-16"
        />
      </Field>

      <SubmitButton className="w-full" pendingText="Salvando...">
        Salvar resultado
      </SubmitButton>
    </form>
  );
}
