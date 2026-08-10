import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

/**
 * Em ambiente serverless (Vercel) o sistema de arquivos do bundle é somente
 * leitura: o banco SQLite gerado no build é copiado para /tmp na primeira
 * requisição de cada instância. Dados gravados valem enquanto a instância
 * viver — para persistência real, configure DATABASE_URL para um Postgres.
 */
function resolveDatabaseUrl(): string | undefined {
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
