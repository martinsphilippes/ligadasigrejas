"use client";

import { useActionState } from "react";
import {
  requestJoinAction,
  cancelJoinAction,
} from "@/lib/actions/join";
import type { ActionState } from "@/lib/actions/league";
import { Field, Textarea } from "@/components/ui/field";
import { FormError, FormSuccess } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

/** Cartão do membro na página da igreja: pedir ingresso / acompanhar status. */
export function JoinRequestCard({
  churchId,
  churchName,
  status,
  isMyChurch,
}: {
  churchId: string;
  churchName: string;
  status: "NENHUMA" | "PENDENTE" | "ACEITO" | "RECUSADO";
  isMyChurch: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    requestJoinAction.bind(null, churchId),
    {},
  );

  if (isMyChurch) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 animate-fade-in">
        <p className="text-sm font-semibold text-brand-900">
          ⭐ Você faz parte desta equipe
        </p>
        <p className="mt-0.5 text-xs text-brand-800/80">
          Acompanhe seus jogos e a campanha em &ldquo;Minha Equipe&rdquo; dentro da liga.
        </p>
      </div>
    );
  }

  if (status === "PENDENTE") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 animate-fade-in">
        <div>
          <p className="text-sm font-semibold text-amber-900">
            ⏳ Solicitação enviada
          </p>
          <p className="mt-0.5 text-xs text-amber-800/80">
            Aguardando o responsável de {churchName} aceitar seu ingresso.
          </p>
        </div>
        <form action={cancelJoinAction.bind(null, churchId)}>
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
          >
            Cancelar solicitação
          </button>
        </form>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="space-y-3 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm animate-fade-in"
    >
      <div>
        <p className="text-sm font-bold text-zinc-900">
          🙋 Quer jogar por esta equipe?
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {status === "RECUSADO"
            ? "Sua solicitação anterior foi recusada, mas você pode tentar novamente."
            : "Envie uma solicitação — o responsável pela equipe decide sobre o seu ingresso."}
        </p>
      </div>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <Field label="Mensagem (opcional)">
        <Textarea
          name="message"
          placeholder="Ex.: Sou membro da igreja, jogo de ala e participo dos cultos aos domingos..."
          className="min-h-16"
          maxLength={500}
        />
      </Field>
      <SubmitButton size="sm" pendingText="Enviando...">
        Solicitar entrada na equipe
      </SubmitButton>
    </form>
  );
}
