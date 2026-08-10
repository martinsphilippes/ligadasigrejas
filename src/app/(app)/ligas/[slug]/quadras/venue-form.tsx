"use client";

import { useActionState } from "react";
import { createVenueAction } from "@/lib/actions/schedule";
import type { ActionState } from "@/lib/actions/league";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function VenueForm({ leagueId }: { leagueId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    createVenueAction.bind(null, leagueId),
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome da quadra">
          <Input name="name" placeholder="Ginásio Municipal" required />
        </Field>
        <Field label="Endereço">
          <Input name="address" placeholder="Rua, número" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_90px_1fr]">
        <Field label="Cidade">
          <Input name="city" placeholder="São Paulo" />
        </Field>
        <Field label="UF">
          <Input name="state" placeholder="SP" maxLength={2} />
        </Field>
        <Field label="Localização (link do mapa)">
          <Input name="mapUrl" type="url" placeholder="https://maps.google.com/..." />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Foto (URL)">
          <Input name="photoUrl" type="url" placeholder="https://..." />
        </Field>
        <Field label="Descrição">
          <Textarea name="description" placeholder="Piso, vestiários, capacidade..." className="min-h-11" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Cadastrando...">Cadastrar quadra</SubmitButton>
      </div>
    </form>
  );
}
