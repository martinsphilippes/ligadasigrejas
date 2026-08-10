import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return (
    <div>
      <div className="mb-8 lg:hidden">
        <span className="text-lg font-bold text-brand-800">🏆 Liga das Igrejas</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Criar conta</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Crie sua conta para organizar ou participar de uma liga.
      </p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-zinc-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
