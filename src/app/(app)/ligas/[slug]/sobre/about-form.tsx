"use client";

import { useActionState } from "react";
import {
  updateLeagueAboutAction,
  updateLeagueAction,
  type ActionState,
} from "@/lib/actions/league";
import { LEAGUE_STATUS } from "@/lib/domain/enums";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function AboutForm({
  leagueId,
  initial,
}: {
  leagueId: string;
  initial: { history: string; organizers: string; contact: string };
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateLeagueAboutAction.bind(null, leagueId),
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <Field label="História">
        <Textarea name="history" defaultValue={initial.history} placeholder="Como a liga surgiu, edições anteriores, campeões..." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organizadores">
          <Textarea name="organizers" defaultValue={initial.organizers} placeholder="Nomes e funções da organização..." />
        </Field>
        <Field label="Contato">
          <Textarea name="contact" defaultValue={initial.contact} placeholder="Telefone, e-mail, redes sociais..." />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Salvando...">Salvar</SubmitButton>
      </div>
    </form>
  );
}

function toDateInput(date: Date | null): string {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

export function LeagueSettingsForm({
  leagueId,
  initial,
}: {
  leagueId: string;
  initial: {
    name: string;
    season: string;
    description: string;
    city: string;
    state: string;
    logoUrl: string;
    bannerUrl: string;
    startDate: Date | null;
    endDate: Date | null;
    status: string;
  };
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateLeagueAction.bind(null, leagueId),
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="grid gap-4 sm:grid-cols-[1fr_120px_180px]">
        <Field label="Nome">
          <Input name="name" defaultValue={initial.name} required />
        </Field>
        <Field label="Temporada">
          <Input name="season" defaultValue={initial.season} required />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={initial.status}>
            {Object.entries(LEAGUE_STATUS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Descrição">
        <Textarea name="description" defaultValue={initial.description} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_90px_1fr_1fr]">
        <Field label="Cidade">
          <Input name="city" defaultValue={initial.city} />
        </Field>
        <Field label="UF">
          <Input name="state" defaultValue={initial.state} maxLength={2} />
        </Field>
        <Field label="Início">
          <Input name="startDate" type="date" defaultValue={toDateInput(initial.startDate)} />
        </Field>
        <Field label="Término">
          <Input name="endDate" type="date" defaultValue={toDateInput(initial.endDate)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Logo (URL)">
          <Input name="logoUrl" type="url" defaultValue={initial.logoUrl} />
        </Field>
        <Field label="Imagem de capa (URL)">
          <Input name="bannerUrl" type="url" defaultValue={initial.bannerUrl} />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Salvando...">Salvar dados da liga</SubmitButton>
      </div>
    </form>
  );
}
