"use client";

import { useActionState, useState } from "react";
import {
  updateAnnouncementAction,
  deleteAnnouncementAction,
  type ActionState,
} from "@/lib/actions/league";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: Date;
}

/** Aviso do dashboard com edição inline e exclusão (para quem administra). */
export function AnnouncementItem({
  leagueId,
  announcement,
  canManage,
}: {
  leagueId: string;
  announcement: AnnouncementData;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, updateAction] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await updateAnnouncementAction(
        leagueId,
        announcement.id,
        prev,
        formData,
      );
      if (result.success) setEditing(false);
      return result;
    },
    {},
  );

  if (editing) {
    return (
      <form
        action={updateAction}
        className="space-y-3 rounded-lg border border-brand-200 bg-white px-4 py-3"
      >
        <FormError message={state.error} />
        <Field label="Título">
          <Input name="title" defaultValue={announcement.title} required autoFocus />
        </Field>
        <Field label="Conteúdo">
          <Textarea name="content" defaultValue={announcement.content} required />
        </Field>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            name="pinned"
            defaultChecked={announcement.pinned}
            className="size-4 accent-brand-700"
          />
          Fixar no topo
        </label>
        <div className="flex gap-2">
          <SubmitButton size="sm" pendingText="Salvando...">
            Salvar
          </SubmitButton>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">
            {announcement.pinned && "📌 "}
            {announcement.title}
          </p>
          <p className="mt-0.5 whitespace-pre-line text-sm text-zinc-600">
            {announcement.content}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">{formatDate(announcement.createdAt)}</p>
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            >
              Editar
            </button>
            <form
              action={deleteAnnouncementAction.bind(null, leagueId, announcement.id)}
              onSubmit={(e) => {
                if (!confirm("Excluir este aviso?")) e.preventDefault();
              }}
            >
              <button
                type="submit"
                className="rounded-md px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50"
              >
                Excluir
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
