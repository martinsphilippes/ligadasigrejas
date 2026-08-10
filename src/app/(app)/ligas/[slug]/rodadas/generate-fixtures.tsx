"use client";

import { useActionState } from "react";
import { generateFixturesAction } from "@/lib/actions/schedule";
import type { ActionState } from "@/lib/actions/league";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError, FormSuccess } from "@/components/ui/form-message";

export function GenerateFixturesButton({ leagueId }: { leagueId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    generateFixturesAction.bind(null, leagueId),
    {},
  );

  return (
    <form action={action} className="space-y-2">
      <SubmitButton size="sm" pendingText="Gerando...">
        ⚡ Gerar tabela
      </SubmitButton>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
    </form>
  );
}
