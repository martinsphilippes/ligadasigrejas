import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div>
      <div className="mb-8 lg:hidden">
        <span className="text-lg font-bold text-brand-800">🏆 Liga das Igrejas</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        Bem-vindo de volta
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Entre para administrar ou acompanhar seus campeonatos.
      </p>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-zinc-500">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-brand-700 hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
