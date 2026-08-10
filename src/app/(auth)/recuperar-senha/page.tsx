import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        Recuperar senha
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Informe seu e-mail para gerar um link de redefinição.
      </p>
      <ForgotForm />
      <p className="mt-6 text-center text-sm text-zinc-500">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
