"use client";

import { useEffect, useRef, useState } from "react";
import { searchPeople, type PersonMatch } from "@/lib/actions/people-search";
import type { ActionState } from "@/lib/actions/league";
import { AthleteForm } from "@/components/forms/athlete-form";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/field";

/**
 * Novo Atleta com busca de pessoas já cadastradas no sistema
 * (por nome, telefone ou e-mail) e autopreenchimento do formulário.
 */
export function AthleteFormWithSearch({
  churchId,
  action,
}: {
  churchId: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [prefill, setPrefill] = useState<PersonMatch | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  // Busca com debounce enquanto digita
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchPeople(churchId, q);
        setResults(found);
        setOpen(found.length > 0);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, churchId]);

  // Fecha ao tocar fora
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(p: PersonMatch) {
    setPrefill(p);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="space-y-5">
      {/* Busca de pessoa existente */}
      <div ref={wrapper} className="relative rounded-xl border border-brand-200 bg-brand-50/60 p-4">
        <p className="mb-2 text-sm font-semibold text-brand-900">
          🔎 Buscar pessoa já cadastrada
        </p>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Nome, telefone ou e-mail..."
          autoComplete="off"
          className="bg-white"
        />
        <p className="mt-1.5 text-xs text-brand-800/70">
          {searching
            ? "Buscando..."
            : "Contas do app e atletas de outras igrejas aparecem aqui — tocar preenche o formulário."}
        </p>
        {open && (
          <ul className="absolute inset-x-4 top-full z-30 -mt-1 max-h-72 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg shadow-zinc-900/10 animate-fade-in">
            {results.map((p, i) => (
              <li key={i}>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    choose(p);
                  }}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-brand-50"
                >
                  <Avatar name={p.name} src={p.photoUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-900">
                      {p.name}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {[p.email, p.phone].filter(Boolean).join(" · ") || "Sem contato"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                    {p.source}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {prefill && (
        <p className="rounded-lg bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800 animate-fade-in">
          Formulário preenchido com os dados de <strong>{prefill.name}</strong> — revise e salve.
        </p>
      )}

      {/* key força o formulário a recarregar com os dados escolhidos */}
      <AthleteForm
        key={prefill ? `${prefill.name}|${prefill.email}` : "vazio"}
        action={action}
        initial={
          prefill
            ? {
                name: prefill.name,
                email: prefill.email,
                phone: prefill.phone,
                photoUrl: prefill.photoUrl,
                birthDate: prefill.birthDate ? new Date(`${prefill.birthDate}T12:00:00`) : null,
                position: prefill.position,
                shirtNumber: prefill.shirtNumber,
              }
            : undefined
        }
        submitLabel="Cadastrar atleta"
      />
    </div>
  );
}
