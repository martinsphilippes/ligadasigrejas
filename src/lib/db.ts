import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

/**
 * Resolução da conexão em runtime:
 * - DATABASE_URL postgres:// → produção com dados persistentes; se a URL for
 *   de um pooler (PgBouncer, ex.: Neon "-pooler" ou Supabase "pooler."),
 *   adiciona pgbouncer=true, exigido pelo Prisma em modo transação.
 * - Sem Postgres na Vercel → modo demonstração: o SQLite gerado no build é
 *   copiado para /tmp (dados válidos apenas por instância).
 */
function resolveDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl?.startsWith("postgres")) {
    if (envUrl.includes("pooler") && !envUrl.includes("pgbouncer")) {
      return `${envUrl}${envUrl.includes("?") ? "&" : "?"}pgbouncer=true`;
    }
    return undefined; // usa a URL do ambiente como está
  }
  if (!process.env.VERCEL) return undefined; // desenvolvimento: usa o .env
  const tmpDb = "/tmp/liga.db";
  if (!fs.existsSync(tmpDb)) {
    const bundled = path.join(process.cwd(), "prisma", "dev.db");
    fs.copyFileSync(bundled, tmpDb);
  }
  return `file:${tmpDb}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = resolveDatabaseUrl();
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
