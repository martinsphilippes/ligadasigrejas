"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/league";
import { AddressFields } from "@/components/forms/address-fields";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

interface ChurchData {
  name?: string;
  denomination?: string;
  city?: string;
  state?: string;
  district?: string | null;
  zipCode?: string | null;
  addressNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  pastorName?: string | null;
  photoUrl?: string | null;
  crestUrl?: string | null;
  description?: string | null;
}

export function ChurchForm({
  action,
  initial,
  submitLabel = "Salvar",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: ChurchData;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome da igreja">
          <Input name="name" defaultValue={initial?.name} placeholder="Igreja Batista Central" required autoFocus />
        </Field>
        <Field label="Denominação">
          <Input name="denomination" defaultValue={initial?.denomination} placeholder="Batista" required />
        </Field>
      </div>
      <AddressFields
        initial={{
          zipCode: initial?.zipCode,
          address: initial?.address,
          addressNumber: initial?.addressNumber,
          district: initial?.district,
          city: initial?.city,
          state: initial?.state,
        }}
        requireCity
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone">
          <Input name="phone" defaultValue={initial?.phone ?? ""} placeholder="(11) 99999-9999" />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" defaultValue={initial?.email ?? ""} placeholder="contato@igreja.com" />
        </Field>
      </div>
      <Field label="Pastor responsável">
        <Input name="pastorName" defaultValue={initial?.pastorName ?? ""} placeholder="Pr. João da Silva" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Foto da igreja (URL)">
          <Input name="photoUrl" type="url" defaultValue={initial?.photoUrl ?? ""} placeholder="https://..." />
        </Field>
        <Field label="Escudo da equipe (URL)">
          <Input name="crestUrl" type="url" defaultValue={initial?.crestUrl ?? ""} placeholder="https://..." />
        </Field>
      </div>
      <Field label="Descrição">
        <Textarea name="description" defaultValue={initial?.description ?? ""} placeholder="Breve história e informações da igreja..." />
      </Field>
      <div className="flex justify-end pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
