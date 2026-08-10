"use client";

import { useActionState, useState } from "react";
import { createAnnouncementAction, type ActionState } from "@/lib/actions/league";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function AnnouncementForm({ leagueId }: { leagueId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(
    createAnnouncementAction.bind(null, leagueId),
    {},
  );

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        + Novo aviso
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-lg border border-zinc-200 p-4">
      <FormError message={state.error} />
      <Field label="Título">
        <Input name="title" placeholder="Ex.: Rodada adiada por chuva" required autoFocus />
      </Field>
      <Field label="Conteúdo">
        <Textarea name="content" placeholder="Detalhes do aviso..." required />
      </Field>
      <label className="flex items-center gap-2 text-sm text-zinc-600">
        <input type="checkbox" name="pinned" className="size-4 accent-brand-700" />
        Fixar no topo
      </label>
      <div className="flex gap-2">
        <SubmitButton size="sm" pendingText="Publicando...">
          Publicar aviso
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
