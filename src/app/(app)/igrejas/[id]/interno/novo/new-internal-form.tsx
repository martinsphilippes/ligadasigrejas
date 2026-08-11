"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/actions/league";
import { Avatar } from "@/components/ui/avatar";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

interface AthleteOption {
  id: string;
  name: string;
  photoUrl: string | null;
  squadRole: string;
  position: string | null;
}

type Side = "A" | "B" | null;

/** Criação do jogo interno: dados + escalação por toque (Verde/Amarelo/Fora). */
export function NewInternalForm({
  action,
  athletes,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  athletes: AthleteOption[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const [sides, setSides] = useState<Record<string, Side>>({});
  const [teamAName, setTeamAName] = useState("Time Verde");
  const [teamBName, setTeamBName] = useState("Time Amarelo");

  const countA = Object.values(sides).filter((s) => s === "A").length;
  const countB = Object.values(sides).filter((s) => s === "B").length;

  // Toque no atleta cicla: Fora → Verde → Amarelo → Fora
  function cycle(id: string) {
    setSides((prev) => {
      const current = prev[id] ?? null;
      const next: Side = current === null ? "A" : current === "A" ? "B" : null;
      return { ...prev, [id]: next };
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      <FormError message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data e horário">
          <Input name="scheduledAt" type="datetime-local" />
        </Field>
        <Field label="Local">
          <Input name="location" placeholder="Quadra da igreja" maxLength={120} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome do time A">
          <Input
            name="teamAName"
            value={teamAName}
            onChange={(e) => setTeamAName(e.target.value)}
            maxLength={30}
            className="border-brand-300 bg-brand-50/50"
          />
        </Field>
        <Field label="Nome do time B">
          <Input
            name="teamBName"
            value={teamBName}
            onChange={(e) => setTeamBName(e.target.value)}
            maxLength={30}
            className="border-amber-300 bg-amber-50/50"
          />
        </Field>
      </div>

      {/* Escalação */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-medium text-zinc-700">
            Escalação — toque no atleta para alternar o time
          </p>
          <p className="text-xs text-zinc-500">
            <span className="font-semibold text-brand-700">{teamAName}: {countA}</span>
            {" · "}
            <span className="font-semibold text-amber-600">{teamBName}: {countB}</span>
          </p>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {athletes.map((a) => {
            const side = sides[a.id] ?? null;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => cycle(a.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-100 active:scale-[0.98]",
                  side === "A"
                    ? "border-brand-400 bg-brand-50"
                    : side === "B"
                      ? "border-amber-400 bg-amber-50"
                      : "border-zinc-200 bg-white hover:border-zinc-300",
                )}
              >
                <Avatar name={a.name} src={a.photoUrl} size="xs" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-800">
                    {a.name}
                  </span>
                  <span className="block text-[11px] text-zinc-400">
                    {a.squadRole === "TITULAR" ? "Titular" : "Reserva"}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                    side === "A"
                      ? "bg-brand-700 text-white"
                      : side === "B"
                        ? "bg-amber-500 text-white"
                        : "bg-zinc-100 text-zinc-400",
                  )}
                >
                  {side === "A" ? teamAName : side === "B" ? teamBName : "Fora"}
                </span>
                {side && <input type="hidden" name={`side-${a.id}`} value={side} />}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Observações">
        <Textarea name="notes" placeholder="Treino tático, racha pós-culto..." className="min-h-14" maxLength={500} />
      </Field>

      <div className="flex justify-end">
        <SubmitButton pendingText="Criando...">Criar jogo interno</SubmitButton>
      </div>
    </form>
  );
}
