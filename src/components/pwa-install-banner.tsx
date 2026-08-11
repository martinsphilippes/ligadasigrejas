"use client";

import { useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "liga-install-dismissed";

/**
 * Banner de instalação do app na tela de início.
 * - Android/Chrome: um clique — usa o prompt nativo (beforeinstallprompt).
 * - iOS/Safari: passo a passo rápido (o iOS não permite instalar por botão).
 * Some quando o app já está instalado ou quando o usuário dispensa.
 */
export function PwaInstallBanner() {
  const [mode, setMode] = useState<"hidden" | "android" | "ios">("hidden");
  const [installing, setInstalling] = useState(false);
  const promptEvent = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* armazenamento indisponível */
    }

    // Já está rodando como app instalado?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ua = navigator.userAgent;
    const isIos =
      /iphone|ipad|ipod/i.test(ua) ||
      (ua.includes("Mac") && "ontouchend" in document); // iPad com UA de desktop
    if (isIos) {
      setMode("ios");
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptEvent.current = e as BeforeInstallPromptEvent;
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setMode("hidden");
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ok */
    }
    setMode("hidden");
  }

  async function install() {
    const event = promptEvent.current;
    if (!event) return;
    setInstalling(true);
    await event.prompt();
    const choice = await event.userChoice;
    setInstalling(false);
    if (choice.outcome === "accepted") setMode("hidden");
  }

  if (mode === "hidden") return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:mx-auto sm:max-w-md animate-fade-up"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="rounded-2xl border border-brand-200 bg-white p-4 shadow-xl shadow-brand-950/20">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt="Liga das Igrejas"
            className="size-12 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-900">
              Adicione o app à sua tela de início
            </p>
            {mode === "android" ? (
              <p className="mt-0.5 text-xs text-zinc-500">
                Um toque e o Liga das Igrejas vira um app no seu celular.
              </p>
            ) : (
              <ol className="mt-1.5 space-y-1 text-xs text-zinc-600">
                <li>
                  <strong>1.</strong> Toque em <strong>Compartilhar</strong>{" "}
                  <span className="inline-block align-middle" aria-hidden>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline text-sky-600">
                      <path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                    </svg>
                  </span>{" "}
                  na barra do Safari
                </li>
                <li>
                  <strong>2.</strong> Escolha{" "}
                  <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong> ➕
                </li>
                <li>
                  <strong>3.</strong> Toque em <strong>Adicionar</strong> — pronto! 🎉
                </li>
              </ol>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fechar aviso"
            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {mode === "android" && (
          <button
            type="button"
            onClick={install}
            disabled={installing}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 text-sm font-semibold text-white transition-all hover:bg-brand-800 active:scale-[0.98] disabled:opacity-60"
          >
            {installing ? (
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              "📲"
            )}
            Instalar o app
          </button>
        )}
      </div>
    </div>
  );
}
