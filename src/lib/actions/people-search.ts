"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canManageChurch } from "@/lib/permissions";

export interface PersonMatch {
  name: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  birthDate: string | null; // ISO (yyyy-mm-dd)
  position: string | null;
  shirtNumber: number | null;
  /** Origem do cadastro, para exibição (ex.: "Conta no app", "Atleta em X") */
  source: string;
}

/**
 * Busca pessoas já cadastradas (contas do app e atletas de qualquer igreja)
 * por nome, e-mail ou telefone — usada no autopreenchimento do Novo Atleta.
 * Restrita a quem gerencia a igreja de destino, por envolver dados de contato.
 */
export async function searchPeople(
  churchId: string,
  query: string,
): Promise<PersonMatch[]> {
  const user = await requireUser();
  if (!(await canManageChurch(user.sub, churchId))) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  // Busca sem diferenciar maiúsculas. No Postgres é preciso mode: insensitive;
  // no SQLite o LIKE já ignora caixa (e o tipo gerado não aceita "mode").
  const like = (process.env.DATABASE_URL?.startsWith("postgres")
    ? { contains: q, mode: "insensitive" }
    : { contains: q }) as { contains: string };

  const [users, athletes] = await Promise.all([
    db.user.findMany({
      where: { OR: [{ name: like }, { email: like }] },
      take: 6,
      select: { name: true, email: true, avatarUrl: true },
    }),
    db.athlete.findMany({
      where: {
        churchId: { not: churchId }, // quem já está nesta igreja não precisa aparecer
        OR: [{ name: like }, { email: like }, { phone: like }],
      },
      take: 6,
      include: { church: { select: { name: true } } },
    }),
  ]);

  const results: PersonMatch[] = [];
  const seen = new Set<string>();

  for (const a of athletes) {
    const key = (a.email ?? `${a.name}|${a.phone ?? ""}`).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      name: a.name,
      email: a.email,
      phone: a.phone,
      photoUrl: a.photoUrl,
      birthDate: a.birthDate ? a.birthDate.toISOString().slice(0, 10) : null,
      position: a.position,
      shirtNumber: a.shirtNumber,
      source: `Atleta em ${a.church.name}`,
    });
  }

  for (const u of users) {
    const key = u.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      name: u.name,
      email: u.email,
      phone: null,
      photoUrl: u.avatarUrl,
      birthDate: null,
      position: null,
      shirtNumber: null,
      source: "Conta no app",
    });
  }

  return results.slice(0, 8);
}
