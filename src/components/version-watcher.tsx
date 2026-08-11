"use client";

import { useEffect, useRef } from "react";

/**
 * Auto-atualização do app instalado: ao voltar para o app (ou a cada 5 min
 * em uso), compara a versão em execução com a do servidor; se mudou,
 * recarrega para buscar o código novo — evita ações quebradas por versão
 * antiga em cache no PWA.
 */
export function VersionWatcher({ current }: { current: string }) {
  const checking = useRef(false);

  useEffect(() => {
    if (current === "dev") return;

    async function check() {
      if (checking.current) return;
      checking.current = true;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const data = (await res.json()) as { v: string };
        if (data.v && data.v !== "dev" && data.v !== current) {
          window.location.reload();
        }
      } catch {
        /* offline — tenta na próxima */
      } finally {
        checking.current = false;
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") check();
    }

    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [current]);

  return null;
}
