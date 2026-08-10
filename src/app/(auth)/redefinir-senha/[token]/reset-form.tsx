"use client";

import { useActionState } from "react";
import { resetPasswordAction, type AuthState } from "@/lib/auth/actions";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<AuthState, FormData>(
    resetPasswordAction,
    {},
  );

  return (
    <form action={action} className="mt-8 space-y-4">
      <FormError message={state.error} />
      <input type="hidden" name="token" value={token} />
      <Field label="Nova senha" hint="Mínimo de 6 caracteres">
        <Input name="password" type="password" placeholder="••••••••" required minLength={6} autoFocus />
      </Field>
      <SubmitButton className="w-full" pendingText="Salvando...">
        Salvar nova senha
      </SubmitButton>
    </form>
  );
}
