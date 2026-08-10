"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getPlatformRole } from "@/lib/permissions";
import { PLATFORM_ROLE } from "@/lib/domain/enums";

/** Altera o papel de plataforma de um usuário (somente o admin). */
export async function setUserRoleAction(userId: string, formData: FormData) {
  const admin = await requireUser();
  if ((await getPlatformRole(admin.sub)) !== "ADMIN") return;
  if (userId === admin.sub) return; // admin não rebaixa a si mesmo

  const role = z
    .enum(Object.keys(PLATFORM_ROLE) as [string, ...string[]])
    .safeParse(formData.get("role"));
  if (!role.success) return;

  await db.user.update({ where: { id: userId }, data: { role: role.data } });
  revalidatePath("/admin/usuarios");
}
