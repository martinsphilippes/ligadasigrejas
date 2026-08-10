"use client";

import { useActionState } from "react";
import { createVenueAction } from "@/lib/actions/schedule";
import type { ActionState } from "@/lib/actions/league";
import { AddressFields } from "@/components/forms/address-fields";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

interface VenueData {
  name?: string;
  address?: string | null;
  district?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  mapUrl?: string | null;
  photoUrl?: string | null;
  description?: string | null;
}

export function VenueForm({
  leagueId,
  action,
  initial,
  submitLabel = "Cadastrar quadra",
}: {
  leagueId?: string;
  action?: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: VenueData;
  submitLabel?: string;
}) {
  const boundAction =
    action ?? createVenueAction.bind(null, leagueId as string);
  const [state, formAction] = useActionState<ActionState, FormData>(boundAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <Field label="Nome da quadra">
        <Input name="name" defaultValue={initial?.name} placeholder="Ginásio Municipal" required />
      </Field>
      <AddressFields
        initial={{
          zipCode: initial?.zipCode,
          address: initial?.address,
          district: initial?.district,
          city: initial?.city,
          state: initial?.state,
        }}
      />
      <Field label="Localização (link do mapa)">
        <Input name="mapUrl" type="url" defaultValue={initial?.mapUrl ?? ""} placeholder="https://maps.google.com/..." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Foto (URL)">
          <Input name="photoUrl" type="url" defaultValue={initial?.photoUrl ?? ""} placeholder="https://..." />
        </Field>
        <Field label="Descrição">
          <Textarea name="description" defaultValue={initial?.description ?? ""} placeholder="Piso, vestiários, capacidade..." className="min-h-11" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
