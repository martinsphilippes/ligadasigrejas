"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/league";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function StaffEditForm({
  action,
  initial,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial: { name: string; role: string; phone: string | null; photoUrl: string | null };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome">
          <Input name="name" defaultValue={initial.name} required autoFocus />
        </Field>
        <Field label="Função">
          <Input name="role" defaultValue={initial.role} placeholder="Técnico" required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone">
          <Input name="phone" defaultValue={initial.phone ?? ""} placeholder="(11) 99999-9999" />
        </Field>
        <Field label="Foto (URL)">
          <Input name="photoUrl" type="url" defaultValue={initial.photoUrl ?? ""} placeholder="https://..." />
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <SubmitButton>Salvar alterações</SubmitButton>
      </div>
    </form>
  );
}
