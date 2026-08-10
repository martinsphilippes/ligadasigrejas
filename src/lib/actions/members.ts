"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getLeagueAccess, can } from "@/lib/permissions";
import { MEMBER_ROLE } from "@/lib/domain/enums";
import type { ActionState } from "./league";

const memberSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  role: z.enum(Object.keys(MEMBER_ROLE) as [string, ...string[]]),
  churchId: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().optional(),
  ),
});

/** Papéis que exigem vínculo com uma igreja específica. */
const CHURCH_SCOPED_ROLES = ["ORGANIZADOR_IGREJA", "ADMIN_EQUIPE"];

export async function addMemberAction(
  leagueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const access = await getLeagueAccess(leagueId, user.sub);
  if (!can(access, "league.manage")) return { error: "Sem permissão." };

  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, role, churchId } = parsed.data;

  if (CHURCH_SCOPED_ROLES.includes(role) && !churchId) {
    return { error: "Este papel exige o vínculo com uma igreja da liga." };
  }

  const target = await db.user.findUnique({ where: { email } });
  if (!target) {
    return { error: "Nenhum usuário com este e-mail. Peça para a pessoa criar uma conta primeiro." };
  }

  const existing = await db.leagueMember.findUnique({
    where: { leagueId_userId_role: { leagueId, userId: target.id, role } },
  });
  if (existing) return { error: "Esta pessoa já possui este papel na liga." };

  await db.leagueMember.create({
    data: { leagueId, userId: target.id, role, churchId },
  });

  const league = await db.league.findUniqueOrThrow({ where: { id: leagueId } });
  revalidatePath(`/ligas/${league.slug}/organizacao`);
  return { success: `${target.name} agora é ${MEMBER_ROLE[role as keyof typeof MEMBER_ROLE]}.` };
}

export async function removeMemberAction(leagueId: string, memberId: string) {
  const user = await requireUser();
  const access = await getLeagueAccess(leagueId, user.sub);
  if (!can(access, "league.manage")) return;

  await db.leagueMember.deleteMany({ where: { id: memberId, leagueId } });
  const league = await db.league.findUniqueOrThrow({ where: { id: leagueId } });
  revalidatePath(`/ligas/${league.slug}/organizacao`);
}
