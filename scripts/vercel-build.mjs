// Build da Vercel: escolhe o banco conforme o ambiente.
//
// - Com DATABASE_URL postgres:// (produção real): usa o schema PostgreSQL,
//   aplica o schema no banco e roda o seed (idempotente — não duplica dados).
//   Para o "db push" prefere a conexão direta (não-pooled) quando disponível.
// - Sem DATABASE_URL (modo demonstração): cria um SQLite local que é
//   embarcado nas funções serverless.

import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
const isPostgres = url.startsWith("postgres");
const schema = isPostgres ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma";

// Conexão direta para operações de schema (poolers como PgBouncer não as suportam bem)
const directUrl =
  process.env.DATABASE_URL_UNPOOLED ?? // Neon
  process.env.DIRECT_URL ?? // Supabase / convenção Prisma
  url;

function run(cmd, extraEnv = {}) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
}

if (!isPostgres) {
  process.env.DATABASE_URL = "file:./dev.db";
}

console.log(
  isPostgres
    ? "🐘 Banco PostgreSQL detectado — dados persistentes."
    : "🧪 Sem DATABASE_URL — modo demonstração com SQLite embutido.",
);

run(`prisma db push --accept-data-loss --skip-generate --schema ${schema}`, {
  DATABASE_URL: isPostgres ? directUrl : process.env.DATABASE_URL,
});
run(`prisma generate --schema ${schema}`);
run(`tsx prisma/seed.ts`, {
  DATABASE_URL: isPostgres ? directUrl : process.env.DATABASE_URL,
});
run(`next build`);
