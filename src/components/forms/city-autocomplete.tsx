"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/field";
import type { Municipio } from "@/lib/municipios";

/**
 * Autocomplete de cidades brasileiras (base oficial do IBGE embutida):
 * sugestões aparecem ao digitar, sem depender do estado; ao escolher uma
 * cidade, a UF é preenchida automaticamente via onSelectUf.
 */
export function CityAutocomplete({
  city,
  setCity,
  uf,
  onSelectUf,
  required = false,
}: {
  city: string;
  setCity: (v: string) => void;
  uf: string;
  onSelectUf: (uf: string) => void;
  required?: boolean;
}) {
  const [results, setResults] = useState<Municipio[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);

  // Busca conforme digita (base carregada sob demanda, uma única vez)
  useEffect(() => {
    if (city.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    let alive = true;
    import("@/lib/municipios").then(({ searchMunicipios }) => {
      if (!alive) return;
      const found = searchMunicipios(city, uf || undefined, 8);
      setResults(found);
      setHighlight(0);
      // não reabre se o valor já é exatamente uma cidade escolhida
      setOpen(found.length > 0 && !(found.length === 1 && found[0].nome === city));
    });
    return () => {
      alive = false;
    };
  }, [city, uf]);

  // Fecha ao tocar fora
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(m: Municipio) {
    setCity(m.nome);
    onSelectUf(m.uf);
    setOpen(false);
  }

  return (
    <div ref={wrapper} className="relative">
      <Input
        name="city"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (results[highlight]) choose(results[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Digite a cidade..."
        autoComplete="off"
        required={required}
        role="combobox"
        aria-expanded={open}
      />
      {open && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg shadow-zinc-900/10 animate-fade-in">
          {results.map((m, i) => (
            <li key={`${m.nome}-${m.uf}`}>
              <button
                type="button"
                // onPointerDown para vencer o blur do input no mobile
                onPointerDown={(e) => {
                  e.preventDefault();
                  choose(m);
                }}
                className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors ${
                  i === highlight
                    ? "bg-brand-50 text-brand-900"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <span className="truncate font-medium">{m.nome}</span>
                <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-bold text-zinc-500">
                  {m.uf}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
