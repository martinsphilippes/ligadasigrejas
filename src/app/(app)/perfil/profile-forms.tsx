"use client";

import { useActionState } from "react";
import {
  updateProfileAction,
  changePasswordAction,
  type AuthState,
} from "@/lib/auth/actions";
import { Field, Input } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function ProfileForm({
  initial,
}: {
  initial: { name: string; avatarUrl: string };
}) {
  const [state, action] = useActionState<AuthState, FormData>(updateProfileAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome">
          <Input name="name" defaultValue={initial.name} required />
        </Field>
        <Field label="Foto (URL)">
          <Input name="avatarUrl" type="url" defaultValue={initial.avatarUrl} placeholder="https://..." />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Salvar perfil</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<AuthState, FormData>(changePasswordAction, {});

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Senha atual">
          <Input name="currentPassword" type="password" required />
        </Field>
        <Field label="Nova senha" hint="Mínimo de 6 caracteres">
          <Input name="newPassword" type="password" required minLength={6} />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Alterar senha</SubmitButton>
      </div>
    </form>
  );
}
