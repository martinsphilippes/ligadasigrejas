"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/league";
import { POSITIONS_BY_SPORT, SQUAD_ROLE } from "@/lib/domain/enums";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

interface AthleteData {
  name?: string;
  photoUrl?: string | null;
  shirtNumber?: number | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: Date | null;
  notes?: string | null;
  squadRole?: string;
}

export function AthleteForm({
  action,
  initial,
  sportSlug = "futsal",
  submitLabel = "Salvar",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: AthleteData;
  sportSlug?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const positions = POSITIONS_BY_SPORT[sportSlug] ?? {};
  const birth = initial?.birthDate
    ? new Date(initial.birthDate).toISOString().slice(0, 10)
    : "";

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div className="grid gap-4 sm:grid-cols-[1fr_110px]">
        <Field label="Nome do atleta">
          <Input name="name" defaultValue={initial?.name} placeholder="Nome completo" required autoFocus />
        </Field>
        <Field label="Nº da camisa">
          <Input name="shirtNumber" type="number" min={0} max={999} defaultValue={initial?.shirtNumber ?? ""} placeholder="10" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Posição">
          <Select name="position" defaultValue={initial?.position ?? ""}>
            <option value="">Selecione...</option>
            {Object.entries(positions).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Condição no elenco">
          <Select name="squadRole" defaultValue={initial?.squadRole ?? "RESERVA"}>
            {Object.entries(SQUAD_ROLE).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone">
          <Input name="phone" defaultValue={initial?.phone ?? ""} placeholder="(11) 99999-9999" />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" defaultValue={initial?.email ?? ""} placeholder="atleta@email.com" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data de nascimento">
          <Input name="birthDate" type="date" defaultValue={birth} />
        </Field>
        <Field label="Foto (URL)">
          <Input name="photoUrl" type="url" defaultValue={initial?.photoUrl ?? ""} placeholder="https://..." />
        </Field>
      </div>
      <Field label="Observações">
        <Textarea name="notes" defaultValue={initial?.notes ?? ""} placeholder="Informações adicionais sobre o atleta..." />
      </Field>
      <div className="flex justify-end pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
