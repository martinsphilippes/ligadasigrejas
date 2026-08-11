import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Versão do deploy em execução — usada pelo cliente para se auto-atualizar. */
export async function GET() {
  return NextResponse.json(
    { v: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
