"use client";

import { useActionState, useState } from "react";
import { addMemberAction } from "@/lib/actions/members";
import type { ActionState } from "@/lib/actions/league";
import { MEMBER_ROLE } from "@/lib/domain/enums";
import { Field, Input, Select } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

const CHURCH_SCOPED = ["ORGANIZADOR_IGREJA", "ADMIN_EQUIPE"];

export function MemberForm({
  leagueId,
  teams,
}: {
  leagueId: string;
  teams: { churchId: string; name: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    addMemberAction.bind(null, leagueId),
    {},
  );
  const [role, setRole] = useState("ORGANIZADOR_GERAL");
  const needsChurch = CHURCH_SCOPED.includes(role);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <Field
        label="E-mail do usuário"
        hint="A pessoa precisa ter uma conta na plataforma."
      >
        <Input name="email" type="email" placeholder="pessoa@email.com" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Papel">
          <Select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
            {Object.entries(MEMBER_ROLE).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </Select>
        </Field>
        {needsChurch && (
          <Field label="Igreja vinculada">
            <Select name="churchId" required defaultValue="">
              <option value="" disabled>
                Selecione...
              </option>
              {teams.map((t) => (
                <option key={t.churchId} value={t.churchId}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <SubmitButton pendingText="Adicionando...">Adicionar organizador</SubmitButton>
    </form>
  );
}
