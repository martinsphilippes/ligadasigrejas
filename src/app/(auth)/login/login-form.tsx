"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/lib/auth/actions";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm() {
  const [state, action] = useActionState<AuthState, FormData>(loginAction, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <FormError message={state.error} />
      <Field label="E-mail">
        <Input name="email" type="email" placeholder="voce@igreja.com" required autoFocus />
      </Field>
      <Field label="Senha">
        <Input name="password" type="password" placeholder="••••••••" required />
      </Field>
      <div className="flex justify-end">
        <Link
          href="/recuperar-senha"
          className="text-xs font-medium text-zinc-500 hover:text-brand-700"
        >
          Esqueci minha senha
        </Link>
      </div>
      <SubmitButton className="w-full" pendingText="Entrando...">
        Entrar
      </SubmitButton>
    </form>
  );
}
