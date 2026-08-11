import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Diagnóstico de latência: região da função, região do banco (extraída do
 * host, sem expor credenciais) e tempo de uma consulta simples.
 */
export async function GET() {
  const dbHost = (() => {
    try {
      const url = process.env.DATABASE_URL ?? "";
      if (url.startsWith("file:")) return "sqlite-local";
      return new URL(url.replace(/^postgres(ql)?:/, "https:")).hostname;
    } catch {
      return "desconhecido";
    }
  })();

  const started = Date.now();
  await db.$queryRaw`SELECT 1`;
  const pingMs = Date.now() - started;
  const started2 = Date.now();
  await db.$queryRaw`SELECT 1`;
  const ping2Ms = Date.now() - started2;

  return NextResponse.json({
    functionRegion: process.env.VERCEL_REGION ?? "local",
    dbHost,
    dbPingMs: pingMs,
    dbPing2Ms: ping2Ms,
  });
}
