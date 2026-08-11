"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canManageChurch } from "@/lib/permissions";
import type { ActionState } from "./league";

// ─── Solicitação do membro ───────────────────────────────────────────────────

export async function requestJoinAction(
  churchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const church = await db.church.findUnique({ where: { id: churchId } });
  if (!church) return { error: "Igreja não encontrada." };

  const me = await db.user.findUniqueOrThrow({ where: { id: user.sub } });
  if (me.churchId === churchId) return { error: "Você já faz parte desta equipe." };

  const message = z
    .string()
    .trim()
    .max(500, "Mensagem muito longa")
    .optional()
    .safeParse(formData.get("message") ?? undefined);
  if (!message.success) return { error: message.error.issues[0].message };

  const existing = await db.joinRequest.findUnique({
    where: { churchId_userId: { churchId, userId: user.sub } },
  });
  if (existing?.status === "PENDENTE") {
    return { error: "Você já tem uma solicitação pendente para esta igreja." };
  }

  // Nova solicitação (ou reenvio após recusa)
  await db.joinRequest.upsert({
    where: { churchId_userId: { churchId, userId: user.sub } },
    create: { churchId, userId: user.sub, message: message.data || null },
    update: { status: "PENDENTE", message: message.data || null },
  });

  revalidatePath(`/igrejas/${churchId}`);
  return { success: "Solicitação enviada! O responsável pela equipe vai avaliar." };
}

/** Cancela a própria solicitação pendente. */
export async function cancelJoinAction(churchId: string) {
  const user = await requireUser();
  await db.joinRequest.deleteMany({
    where: { churchId, userId: user.sub, status: "PENDENTE" },
  });
  revalidatePath(`/igrejas/${churchId}`);
}

// ─── Decisão do responsável ──────────────────────────────────────────────────

async function requireRequestManager(requestId: string) {
  const user = await requireUser();
  const request = await db.joinRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { user: true },
  });
  if (!(await canManageChurch(user.sub, request.churchId))) {
    throw new Error("Sem permissão para decidir sobre esta solicitação.");
  }
  return request;
}

/** Aceita: vincula o usuário à igreja e o adiciona ao elenco como reserva. */
export async function acceptJoinAction(requestId: string) {
  const request = await requireRequestManager(requestId);
  if (request.status !== "PENDENTE") return;

  await db.$transaction(async (tx) => {
    await tx.joinRequest.update({
      where: { id: request.id },
      data: { status: "ACEITO" },
    });
    await tx.user.update({
      where: { id: request.userId },
      data: { churchId: request.churchId },
    });
    // Entra no elenco (se ainda não houver atleta com o mesmo e-mail)
    const alreadyInSquad = await tx.athlete.findFirst({
      where: { churchId: request.churchId, email: request.user.email },
    });
    if (!alreadyInSquad) {
      await tx.athlete.create({
        data: {
          churchId: request.churchId,
          name: request.user.name,
          email: request.user.email,
          photoUrl: request.user.avatarUrl,
          squadRole: "RESERVA",
        },
      });
    }
  });

  revalidatePath(`/igrejas/${request.churchId}`, "layout");
}

export async function rejectJoinAction(requestId: string) {
  const request = await requireRequestManager(requestId);
  if (request.status !== "PENDENTE") return;

  await db.joinRequest.update({
    where: { id: request.id },
    data: { status: "RECUSADO" },
  });
  revalidatePath(`/igrejas/${request.churchId}`);
}
