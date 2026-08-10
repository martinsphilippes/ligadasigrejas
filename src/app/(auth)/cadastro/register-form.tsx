"use client";

import { useActionState } from "react";
import { registerAction, type AuthState } from "@/lib/auth/actions";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function RegisterForm() {
  const [state, action] = useActionState<AuthState, FormData>(registerAction, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <FormError message={state.error} />
      <Field label="Nome completo">
        <Input name="name" placeholder="Seu nome" required autoFocus />
      </Field>
      <Field label="E-mail">
        <Input name="email" type="email" placeholder="voce@igreja.com" required />
      </Field>
      <Field label="Senha" hint="Mínimo de 6 caracteres">
        <Input name="password" type="password" placeholder="••••••••" required minLength={6} />
      </Field>
      <SubmitButton className="w-full" pendingText="Criando conta...">
        Criar conta
      </SubmitButton>
    </form>
  );
}
