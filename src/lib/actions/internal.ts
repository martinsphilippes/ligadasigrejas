"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canManageChurch } from "@/lib/permissions";
import type { ActionState } from "./league";

const MAX_HIGHLIGHTS = 3;

async function requireManager(churchId: string) {
  const user = await requireUser();
  if (!(await canManageChurch(user.sub, churchId))) {
    throw new Error("Sem permissão para gerenciar os jogos internos desta igreja.");
  }
  return user;
}

function revalidateInternal(churchId: string) {
  revalidatePath(`/igrejas/${churchId}`, "layout");
}

const optional = (schema: z.ZodString) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());

const matchSchema = z.object({
  scheduledAt: optional(z.string()),
  location: optional(z.string().trim().max(120)),
  notes: optional(z.string().trim().max(500)),
  teamAName: z.string().trim().min(1).max(30).catch("Time Verde"),
  teamBName: z.string().trim().min(1).max(30).catch("Time Amarelo"),
});

function parseDateTime(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Cria o jogo interno com a escalação (campos side-<athleteId> = A | B). */
export async function createInternalMatchAction(
  churchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireManager(churchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const parsed = matchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Escalação: valida que os atletas pertencem à igreja
  const athletes = await db.athlete.findMany({
    where: { churchId, active: true },
    select: { id: true },
  });
  const valid = new Set(athletes.map((a) => a.id));
  const players: { athleteId: string; side: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("side-")) continue;
    const athleteId = key.slice(5);
    if (valid.has(athleteId) && (value === "A" || value === "B")) {
      players.push({ athleteId, side: value });
    }
  }
  const sideA = players.filter((p) => p.side === "A").length;
  const sideB = players.filter((p) => p.side === "B").length;
  if (sideA === 0 || sideB === 0) {
    return { error: "Escale pelo menos 1 atleta em cada time." };
  }

  const match = await db.internalMatch.create({
    data: {
      churchId,
      scheduledAt: parseDateTime(parsed.data.scheduledAt),
      location: parsed.data.location,
      notes: parsed.data.notes,
      teamAName: parsed.data.teamAName,
      teamBName: parsed.data.teamBName,
      players: { create: players },
    },
  });

  revalidateInternal(churchId);
  redirect(`/igrejas/${churchId}/interno/${match.id}`);
}

/** Placar e situação do jogo interno. */
export async function recordInternalResultAction(
  matchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const match = await db.internalMatch.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Jogo não encontrado." };
  try {
    await requireManager(match.churchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const schema = z.object({
    status: z.enum(["AGENDADO", "FINALIZADO", "CANCELADO"]),
    scoreA: z.preprocess(
      (v) => (v === "" || v == null ? undefined : Number(v)),
      z.number().int().min(0).max(99).optional(),
    ),
    scoreB: z.preprocess(
      (v) => (v === "" || v == null ? undefined : Number(v)),
      z.number().int().min(0).max(99).optional(),
    ),
    scheduledAt: optional(z.string()),
    location: optional(z.string().trim().max(120)),
    notes: optional(z.string().trim().max(500)),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (d.status === "FINALIZADO" && (d.scoreA == null || d.scoreB == null)) {
    return { error: "Informe o placar completo para finalizar." };
  }

  await db.internalMatch.update({
    where: { id: matchId },
    data: {
      status: d.status,
      scoreA: d.scoreA ?? null,
      scoreB: d.scoreB ?? null,
      scheduledAt: parseDateTime(d.scheduledAt),
      location: d.location ?? null,
      notes: d.notes ?? null,
    },
  });

  revalidateInternal(match.churchId);
  return { success: "Jogo atualizado." };
}

/** Registra gol ou destaque (máx. 3 destaques por jogo). */
export async function addInternalEventAction(
  matchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const match = await db.internalMatch.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Jogo não encontrado." };
  try {
    await requireManager(match.churchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }

  const schema = z.object({
    athleteId: z.string().min(1, "Selecione o atleta"),
    type: z.enum(["GOL", "ASSISTENCIA", "DESTAQUE"]),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Atleta precisa estar escalado no jogo
  const inLineup = await db.internalPlayer.findUnique({
    where: { matchId_athleteId: { matchId, athleteId: parsed.data.athleteId } },
  });
  if (!inLineup) return { error: "Este atleta não está escalado neste jogo." };

  if (parsed.data.type === "DESTAQUE") {
    const highlights = await db.internalEvent.findMany({
      where: { matchId, type: "DESTAQUE" },
    });
    if (highlights.some((h) => h.athleteId === parsed.data.athleteId)) {
      return { error: "Este atleta já está entre os destaques." };
    }
    if (highlights.length >= MAX_HIGHLIGHTS) {
      return { error: `Máximo de ${MAX_HIGHLIGHTS} destaques por jogo.` };
    }
  }

  await db.internalEvent.create({
    data: { matchId, athleteId: parsed.data.athleteId, type: parsed.data.type },
  });

  revalidateInternal(match.churchId);
  const labels = { GOL: "Gol registrado.", ASSISTENCIA: "Assistência registrada.", DESTAQUE: "Destaque marcado." };
  return { success: labels[parsed.data.type] };
}

/** Nota de desempenho do atleta no jogo (1–5; 0 limpa a nota). */
export async function setInternalRatingAction(
  matchId: string,
  athleteId: string,
  rating: number,
) {
  const match = await db.internalMatch.findUnique({ where: { id: matchId } });
  if (!match) return;
  await requireManager(match.churchId);
  const value = Math.round(rating);
  if (value < 0 || value > 5) return;

  await db.internalPlayer.updateMany({
    where: { matchId, athleteId },
    data: { rating: value === 0 ? null : value },
  });
  revalidateInternal(match.churchId);
}

/** Marca/desmarca falta do atleta no treino (faltou não conta jogo). */
export async function toggleAttendanceAction(matchId: string, athleteId: string) {
  const match = await db.internalMatch.findUnique({ where: { id: matchId } });
  if (!match) return;
  await requireManager(match.churchId);

  const player = await db.internalPlayer.findUnique({
    where: { matchId_athleteId: { matchId, athleteId } },
  });
  if (!player) return;
  await db.internalPlayer.update({
    where: { id: player.id },
    data: { attended: !player.attended },
  });
  revalidateInternal(match.churchId);
}

export async function deleteInternalEventAction(eventId: string) {
  const event = await db.internalEvent.findUnique({
    where: { id: eventId },
    include: { match: true },
  });
  if (!event) return;
  await requireManager(event.match.churchId);
  await db.internalEvent.delete({ where: { id: eventId } });
  revalidateInternal(event.match.churchId);
}

/** Move um atleta de lado (A/B) ou o tira do jogo (FORA). */
export async function setInternalPlayerAction(
  matchId: string,
  athleteId: string,
  side: string,
) {
  const match = await db.internalMatch.findUnique({ where: { id: matchId } });
  if (!match) return;
  await requireManager(match.churchId);

  if (side === "FORA") {
    await db.internalPlayer.deleteMany({ where: { matchId, athleteId } });
  } else if (side === "A" || side === "B") {
    const athlete = await db.athlete.findUnique({ where: { id: athleteId } });
    if (!athlete || athlete.churchId !== match.churchId) return;
    await db.internalPlayer.upsert({
      where: { matchId_athleteId: { matchId, athleteId } },
      create: { matchId, athleteId, side },
      update: { side },
    });
  }
  revalidateInternal(match.churchId);
}

export async function deleteInternalMatchAction(matchId: string) {
  const match = await db.internalMatch.findUnique({ where: { id: matchId } });
  if (!match) return;
  await requireManager(match.churchId);
  await db.internalMatch.delete({ where: { id: matchId } });
  revalidateInternal(match.churchId);
  redirect(`/igrejas/${match.churchId}/interno`);
}
