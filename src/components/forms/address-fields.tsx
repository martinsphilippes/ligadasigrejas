"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { UFS, formatCep } from "@/lib/brazil";
import { CityAutocomplete } from "./city-autocomplete";

interface AddressInitial {
  zipCode?: string | null;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
}

/**
 * Campos de endereço brasileiros com auto-preenchimento:
 * CEP (ViaCEP) preenche endereço, bairro, cidade e UF; a cidade tem
 * autocomplete com os municípios oficiais do IBGE e define a UF sozinha.
 */
export function AddressFields({
  initial,
  showStreet = true,
  showDistrict = true,
  requireCity = false,
}: {
  initial?: AddressInitial;
  showStreet?: boolean;
  showDistrict?: boolean;
  requireCity?: boolean;
}) {
  const [zip, setZip] = useState(formatCep(initial?.zipCode ?? ""));
  const [address, setAddress] = useState(initial?.address ?? "");
  const [district, setDistrict] = useState(initial?.district ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [uf, setUf] = useState(initial?.state ?? "");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");

  async function onZipChange(raw: string) {
    const masked = formatCep(raw);
    setZip(masked);
    const digits = masked.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepStatus("idle");
      return;
    }
    setCepStatus("loading");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepStatus("error");
        return;
      }
      if (data.logradouro) setAddress(data.logradouro);
      if (data.bairro) setDistrict(data.bairro);
      if (data.localidade) setCity(data.localidade);
      if (data.uf) setUf(data.uf);
      setCepStatus("ok");
    } catch {
      setCepStatus("error");
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
        <Field
          label="CEP"
          hint={
            cepStatus === "loading"
              ? "Buscando endereço..."
              : cepStatus === "error"
                ? "CEP não encontrado"
                : cepStatus === "ok"
                  ? "Endereço preenchido ✓"
                  : "Preenche o endereço"
          }
        >
          <Input
            name="zipCode"
            value={zip}
            onChange={(e) => onZipChange(e.target.value)}
            placeholder="00000-000"
            inputMode="numeric"
            autoComplete="postal-code"
          />
        </Field>
        {showStreet && (
          <Field label="Endereço">
            <Input
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número"
              autoComplete="street-address"
            />
          </Field>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_170px]">
        {showDistrict ? (
          <Field label="Bairro">
            <Input
              name="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Centro"
            />
          </Field>
        ) : (
          <span className="hidden sm:block" />
        )}
        <Field label="Cidade" hint="Digite 2 letras para ver sugestões">
          <CityAutocomplete
            city={city}
            setCity={setCity}
            uf={uf}
            onSelectUf={setUf}
            required={requireCity}
          />
        </Field>
        <UfSelect uf={uf} setUf={setUf} required={requireCity} />
      </div>
    </>
  );
}

/** Apenas Cidade + UF (para ligas), com o mesmo autocomplete do IBGE. */
export function CityUfFields({
  initial,
  requireCity = false,
}: {
  initial?: { city?: string | null; state?: string | null };
  requireCity?: boolean;
}) {
  const [city, setCity] = useState(initial?.city ?? "");
  const [uf, setUf] = useState(initial?.state ?? "");

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
      <Field label="Cidade" hint="Digite 2 letras para ver sugestões">
        <CityAutocomplete
          city={city}
          setCity={setCity}
          uf={uf}
          onSelectUf={setUf}
          required={requireCity}
        />
      </Field>
      <UfSelect uf={uf} setUf={setUf} required={requireCity} />
    </div>
  );
}

function UfSelect({
  uf,
  setUf,
  required,
}: {
  uf: string;
  setUf: (v: string) => void;
  required: boolean;
}) {
  return (
    <Field label="Estado (UF)" hint="Preenchido ao escolher a cidade">
      <Select name="state" value={uf} onChange={(e) => setUf(e.target.value)} required={required}>
        <option value="">Selecione...</option>
        {UFS.map((u) => (
          <option key={u.sigla} value={u.sigla}>
            {u.sigla} — {u.nome}
          </option>
        ))}
      </Select>
    </Field>
  );
}
