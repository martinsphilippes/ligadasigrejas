import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-dvh">
      {/* Painel institucional (desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-950 p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(700px circle at 20% 10%, rgba(47,157,102,0.35), transparent 60%), radial-gradient(600px circle at 90% 90%, rgba(234,176,48,0.18), transparent 55%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gold-500 text-xl">
            🏆
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            Liga das Igrejas
          </span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Campeonatos entre igrejas, organizados do início ao fim.
          </h2>
          <p className="mt-4 text-brand-200">
            Tabelas, rodadas, elencos, resultados e classificação em tempo real —
            tudo em um só lugar, para qualquer denominação.
          </p>
        </div>
        <p className="relative text-xs text-brand-300/70">
          Futsal hoje. Novas modalidades em breve.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-up">{children}</div>
      </div>
    </div>
  );
}
