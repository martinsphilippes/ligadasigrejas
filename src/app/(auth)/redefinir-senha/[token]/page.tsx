import type { Metadata } from "next";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Redefinir senha" };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        Redefinir senha
      </h1>
      <p className="mt-1 text-sm text-zinc-500">Escolha sua nova senha.</p>
      <ResetForm token={token} />
    </div>
  );
}
