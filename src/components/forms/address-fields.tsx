"use client";

import { useEffect, useId, useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { UFS, formatCep } from "@/lib/brazil";

/** Municípios reais do estado, via API pública do IBGE. */
function useCities(uf: string) {
  const [cities, setCities] = useState<string[]>([]);
  useEffect(() => {
    if (!uf) {
      setCities([]);
      return;
    }
    let alive = true;
    fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`,
    )
      .then((r) => r.json())
      .then((data: { nome: string }[]) => {
        if (alive && Array.isArray(data)) setCities(data.map((m) => m.nome));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [uf]);
  return cities;
}

interface AddressInitial {
  zipCode?: string | null;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
}

/**
 * Campos de endereço brasileiros com auto-preenchimento:
 * CEP (ViaCEP) preenche endereço, bairro, cidade e UF; a cidade sugere
 * municípios reais do IBGE conforme o estado escolhido.
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
  const listId = useId();
  const [zip, setZip] = useState(formatCep(initial?.zipCode ?? ""));
  const [address, setAddress] = useState(initial?.address ?? "");
  const [district, setDistrict] = useState(initial?.district ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [uf, setUf] = useState(initial?.state ?? "");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const cities = useCities(uf);

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
        <CityUfInner
          listId={listId}
          city={city}
          setCity={setCity}
          uf={uf}
          setUf={setUf}
          cities={cities}
          requireCity={requireCity}
        />
      </div>
    </>
  );
}

/** Apenas Cidade + UF (para ligas): cidades reais do IBGE conforme o estado. */
export function CityUfFields({
  initial,
  requireCity = false,
}: {
  initial?: { city?: string | null; state?: string | null };
  requireCity?: boolean;
}) {
  const listId = useId();
  const [city, setCity] = useState(initial?.city ?? "");
  const [uf, setUf] = useState(initial?.state ?? "");
  const cities = useCities(uf);

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
      <CityUfInner
        listId={listId}
        city={city}
        setCity={setCity}
        uf={uf}
        setUf={setUf}
        cities={cities}
        requireCity={requireCity}
      />
    </div>
  );
}

function CityUfInner({
  listId,
  city,
  setCity,
  uf,
  setUf,
  cities,
  requireCity,
}: {
  listId: string;
  city: string;
  setCity: (v: string) => void;
  uf: string;
  setUf: (v: string) => void;
  cities: string[];
  requireCity: boolean;
}) {
  return (
    <>
      <Field label="Cidade" hint={uf && cities.length > 0 ? `${cities.length} municípios de ${uf}` : undefined}>
        <Input
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={uf ? "Digite para buscar..." : "Escolha o estado ao lado"}
          list={listId}
          required={requireCity}
          autoComplete="address-level2"
        />
        <datalist id={listId}>
          {cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="Estado (UF)">
        <Select
          name="state"
          value={uf}
          onChange={(e) => setUf(e.target.value)}
          required={requireCity}
        >
          <option value="">Selecione...</option>
          {UFS.map((u) => (
            <option key={u.sigla} value={u.sigla}>
              {u.sigla} — {u.nome}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
