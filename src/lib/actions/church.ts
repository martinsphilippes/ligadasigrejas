"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import {
  canManageChurch,
  getPlatformRole,
  isPlatformOrganizer,
} from "@/lib/permissions";
import type { ActionState } from "./league";

/** Exige permissão de gestão sobre a igreja; lança erro caso contrário. */
async function requireChurchManager(churchId: string) {
  const user = await requireUser();
  if (!(await canManageChurch(user.sub, churchId))) {
    throw new Error("Sem permissão para gerenciar esta igreja.");
  }
  return user;
}

const optional = (schema: z.ZodString) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());

const churchSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da igreja"),
  denomination: z.string().trim().min(2, "Informe a denominação"),
  city: z.string().trim().min(2, "Informe a cidade"),
  state: z.string().trim().min(2, "Informe a UF").max(2, "Use a sigla (ex.: SP)"),
  district: optional(z.string().trim()),
  address: optional(z.string().trim()),
  phone: optional(z.string().trim()),
  email: optional(z.string().trim().email("E-mail inválido")),
  pastorName: optional(z.string().trim()),
  photoUrl: optional(z.string().trim().url("URL da foto inválida")),
  crestUrl: optional(z.string().trim().url("URL do escudo inválida")),
  description: optional(z.string().trim()),
});

export async function createChurchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isPlatformOrganizer(await getPlatformRole(user.sub))) {
    return { error: "Apenas organizadores podem cadastrar igrejas." };
  }
  const parsed = churchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const church = await db.church.create({
    data: { ...parsed.data, state: parsed.data.state.toUpperCase() },
  });
  revalidatePath("/igrejas");
  redirect(`/igrejas/${church.id}`);
}

export async function updateChurchAction(
  churchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireChurchManager(churchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }
  const parsed = churchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  await db.church.update({
    where: { id: churchId },
    data: {
      name: d.name,
      denomination: d.denomination,
      city: d.city,
      state: d.state.toUpperCase(),
      district: d.district ?? null,
      address: d.address ?? null,
      phone: d.phone ?? null,
      email: d.email ?? null,
      pastorName: d.pastorName ?? null,
      photoUrl: d.photoUrl ?? null,
      crestUrl: d.crestUrl ?? null,
      description: d.description ?? null,
    },
  });
  revalidatePath(`/igrejas/${churchId}`, "layout");
  return { success: "Igreja atualizada." };
}

export async function deleteChurchAction(churchId: string) {
  const user = await requireUser();
  // Excluir igreja é ato de organizador (remove atletas e participações).
  if (!isPlatformOrganizer(await getPlatformRole(user.sub))) return;
  await db.church.delete({ where: { id: churchId } });
  revalidatePath("/igrejas");
  redirect("/igrejas");
}

// ─── Atletas ─────────────────────────────────────────────────────────────────

const athleteSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do atleta"),
  photoUrl: optional(z.string().trim().url("URL da foto inválida")),
  shirtNumber: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(0).max(999).optional(),
  ),
  position: optional(z.string().trim()),
  phone: optional(z.string().trim()),
  email: optional(z.string().trim().email("E-mail inválido")),
  birthDate: optional(z.string()),
  notes: optional(z.string().trim()),
  squadRole: z.enum(["TITULAR", "RESERVA"]).default("RESERVA"),
});

function parseBirthDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

export async function createAthleteAction(
  churchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireChurchManager(churchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }
  const parsed = athleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  await db.athlete.create({
    data: {
      churchId,
      name: d.name,
      photoUrl: d.photoUrl,
      shirtNumber: d.shirtNumber,
      position: d.position,
      phone: d.phone,
      email: d.email,
      birthDate: parseBirthDate(d.birthDate),
      notes: d.notes,
      squadRole: d.squadRole,
    },
  });
  revalidatePath(`/igrejas/${churchId}`, "layout");
  redirect(`/igrejas/${churchId}`);
}

export async function updateAthleteAction(
  athleteId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const existing = await db.athlete.findUnique({ where: { id: athleteId } });
  if (!existing) return { error: "Atleta não encontrado." };
  try {
    await requireChurchManager(existing.churchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }
  const parsed = athleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const athlete = await db.athlete.update({
    where: { id: athleteId },
    data: {
      name: d.name,
      photoUrl: d.photoUrl ?? null,
      shirtNumber: d.shirtNumber ?? null,
      position: d.position ?? null,
      phone: d.phone ?? null,
      email: d.email ?? null,
      birthDate: parseBirthDate(d.birthDate),
      notes: d.notes ?? null,
      squadRole: d.squadRole,
    },
  });
  revalidatePath(`/igrejas/${athlete.churchId}`, "layout");
  redirect(`/igrejas/${athlete.churchId}`);
}

/** Alterna atleta entre titular e reserva (organização da equipe). */
export async function toggleSquadRoleAction(athleteId: string) {
  const athlete = await db.athlete.findUniqueOrThrow({ where: { id: athleteId } });
  await requireChurchManager(athlete.churchId);
  await db.athlete.update({
    where: { id: athleteId },
    data: { squadRole: athlete.squadRole === "TITULAR" ? "RESERVA" : "TITULAR" },
  });
  revalidatePath(`/igrejas/${athlete.churchId}`, "layout");
}

export async function deleteAthleteAction(athleteId: string) {
  const existing = await db.athlete.findUniqueOrThrow({ where: { id: athleteId } });
  await requireChurchManager(existing.churchId);
  const athlete = await db.athlete.delete({ where: { id: athleteId } });
  revalidatePath(`/igrejas/${athlete.churchId}`, "layout");
}

// ─── Comissão técnica ────────────────────────────────────────────────────────

const staffSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  role: z.string().trim().min(2, "Informe a função"),
  phone: optional(z.string().trim()),
  photoUrl: optional(z.string().trim().url("URL inválida")),
});

export async function createStaffAction(
  churchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireChurchManager(churchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }
  const parsed = staffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.staffMember.create({ data: { churchId, ...parsed.data } });
  revalidatePath(`/igrejas/${churchId}`, "layout");
  return { success: "Membro adicionado à comissão." };
}

export async function updateStaffAction(
  staffId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const existing = await db.staffMember.findUnique({ where: { id: staffId } });
  if (!existing) return { error: "Membro da comissão não encontrado." };
  try {
    await requireChurchManager(existing.churchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sem permissão." };
  }
  const parsed = staffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  await db.staffMember.update({
    where: { id: staffId },
    data: {
      name: d.name,
      role: d.role,
      phone: d.phone ?? null,
      photoUrl: d.photoUrl ?? null,
    },
  });
  revalidatePath(`/igrejas/${existing.churchId}`, "layout");
  redirect(`/igrejas/${existing.churchId}`);
}

export async function deleteStaffAction(staffId: string) {
  const existing = await db.staffMember.findUniqueOrThrow({ where: { id: staffId } });
  await requireChurchManager(existing.churchId);
  const staff = await db.staffMember.delete({ where: { id: staffId } });
  revalidatePath(`/igrejas/${staff.churchId}`, "layout");
}
