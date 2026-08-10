import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

/**
 * Encerra a sessão e volta ao login. Usado pelo logout e também para limpar
 * sessões órfãs (JWT válido cujo usuário não existe mais no banco — ex.:
 * troca de banco de dados).
 */
export async function GET(request: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url));
}
