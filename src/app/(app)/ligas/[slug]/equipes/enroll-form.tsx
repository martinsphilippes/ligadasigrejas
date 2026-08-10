"use client";

import Link from "next/link";
import { useActionState } from "react";
import { enrollChurchAction } from "@/lib/actions/schedule";
import type { ActionState } from "@/lib/actions/league";
import { Select } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function EnrollForm({
  leagueId,
  churches,
}: {
  leagueId: string;
  churches: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    enrollChurchAction.bind(null, leagueId),
    {},
  );

  if (churches.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Todas as igrejas cadastradas já estão inscritas.{" "}
        <Link href="/igrejas/nova" className="font-medium text-brand-700 hover:underline">
          Cadastrar nova igreja →
        </Link>
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="flex flex-wrap gap-3">
        <Select name="churchId" required defaultValue="" className="max-w-sm flex-1">
          <option value="" disabled>
            Selecione a igreja...
          </option>
          {churches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <SubmitButton pendingText="Inscrevendo...">Inscrever</SubmitButton>
      </div>
    </form>
  );
}
