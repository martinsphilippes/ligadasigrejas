"use client";

import { useActionState } from "react";
import { generatePlayoffsAction } from "@/lib/actions/schedule";
import type { ActionState } from "@/lib/actions/league";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError, FormSuccess } from "@/components/ui/form-message";

/**
 * Gera a primeira fase do mata-mata (escolhendo o nº de classificados)
 * ou a próxima fase a partir dos vencedores da fase atual.
 */
export function GeneratePlayoffsButton({
  leagueId,
  hasKnockout,
  maxTeams,
}: {
  leagueId: string;
  hasKnockout: boolean;
  maxTeams: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    generatePlayoffsAction.bind(null, leagueId),
    {},
  );
  const sizes = [2, 4, 8, 16].filter((n) => n <= maxTeams);

  return (
    <form action={action} className="space-y-2">
      <div className="flex items-center gap-2">
        {!hasKnockout && (
          <select
            name="qualifiedCount"
            defaultValue={sizes.includes(4) ? "4" : String(sizes[sizes.length - 1] ?? 2)}
            className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-700"
            aria-label="Quantidade de classificados"
          >
            {sizes.map((n) => (
              <option key={n} value={n}>
                {n} classificados
              </option>
            ))}
          </select>
        )}
        <SubmitButton variant="gold" size="sm" pendingText="Gerando...">
          ⚔️ {hasKnockout ? "Gerar próxima fase" : "Gerar fase final"}
        </SubmitButton>
      </div>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
    </form>
  );
}
