"use client";

import { useActionState } from "react";
import { createLeagueAction, type ActionState } from "@/lib/actions/league";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function NewLeagueForm() {
  const [state, action] = useActionState<ActionState, FormData>(
    createLeagueAction,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field label="Nome da liga">
          <Input name="name" placeholder="Copa das Igrejas" required autoFocus />
        </Field>
        <Field label="Temporada">
          <Input name="season" placeholder="2026" required />
        </Field>
      </div>
      <Field label="Descrição">
        <Textarea name="description" placeholder="Campeonato de futsal entre igrejas da região..." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
        <Field label="Cidade">
          <Input name="city" placeholder="São Paulo" />
        </Field>
        <Field label="UF">
          <Input name="state" placeholder="SP" maxLength={2} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data de início">
          <Input name="startDate" type="date" />
        </Field>
        <Field label="Data final">
          <Input name="endDate" type="date" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Logo (URL)">
          <Input name="logoUrl" type="url" placeholder="https://..." />
        </Field>
        <Field label="Imagem de capa (URL)">
          <Input name="bannerUrl" type="url" placeholder="https://..." />
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <SubmitButton pendingText="Criando liga...">Criar liga</SubmitButton>
      </div>
    </form>
  );
}
