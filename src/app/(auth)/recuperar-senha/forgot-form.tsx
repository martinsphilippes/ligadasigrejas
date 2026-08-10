"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type AuthState } from "@/lib/auth/actions";
import { Field, Input } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function ForgotForm() {
  const [state, action] = useActionState<AuthState, FormData>(
    forgotPasswordAction,
    {},
  );

  return (
    <form action={action} className="mt-8 space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      {state.resetLink && (
        <Link
          href={state.resetLink}
          className="block truncate rounded-lg border border-brand-200 bg-white px-3.5 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          Redefinir senha agora →
        </Link>
      )}
      <Field label="E-mail">
        <Input name="email" type="email" placeholder="voce@igreja.com" required autoFocus />
      </Field>
      <SubmitButton className="w-full" pendingText="Gerando link...">
        Gerar link de redefinição
      </SubmitButton>
    </form>
  );
}
