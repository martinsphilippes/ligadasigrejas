"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/league";
import { Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

/** Formulário compacto para adicionar membro da comissão técnica. */
export function StaffForm({
  action,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Input name="name" placeholder="Nome" required />
        <Input name="role" placeholder="Função (ex.: Técnico)" required />
        <SubmitButton variant="secondary" pendingText="...">
          Adicionar
        </SubmitButton>
      </div>
    </form>
  );
}
