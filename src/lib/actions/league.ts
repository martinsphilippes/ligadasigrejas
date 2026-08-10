"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getLeagueAccess, can } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import { LEAGUE_STATUS } from "@/lib/domain/enums";

export interface ActionState {
  error?: string;
  success?: string;
}

const optional = (schema: z.ZodString) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());

const leagueSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres"),
  season: z.string().trim().min(1, "Informe a temporada"),
  description: optional(z.string().trim()),
  city: optional(z.string().trim()),
  state: optional(z.string().trim().max(2, "Use a sigla do estado (ex.: SP)")),
  logoUrl: optional(z.string().trim().url("URL do logo inválida")),
  bannerUrl: optional(z.string().trim().url("URL da imagem inválida")),
  startDate: optional(z.string()),
  endDate: optional(z.string()),
});

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

export async function createLeagueAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = leagueSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const futsal = await db.sport.upsert({
    where: { slug: "futsal" },
    update: {},
    create: {
      slug: "futsal",
      name: "Futsal",
      playersOnField: 5,
      description: "4 jogadores de linha + 1 goleiro",
    },
  });

  // Slug único: nome-temporada, com sufixo numérico em caso de colisão.
  const base = slugify(`${data.name} ${data.season}`);
  let slug = base;
  for (let i = 2; await db.league.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }

  const league = await db.league.create({
    data: {
      slug,
      name: data.name,
      season: data.season,
      description: data.description,
      city: data.city,
      state: data.state?.toUpperCase(),
      logoUrl: data.logoUrl,
      bannerUrl: data.bannerUrl,
      startDate: parseDate(data.startDate),
      endDate: parseDate(data.endDate),
      sportId: futsal.id,
      ownerId: user.sub,
      rules: { create: {} }, // regras padrão de futsal, configuráveis na tela Regras
    },
  });

  redirect(`/ligas/${league.slug}`);
}

const leagueUpdateSchema = leagueSchema.extend({
  status: z.enum(Object.keys(LEAGUE_STATUS) as [string, ...string[]]),
});

export async function updateLeagueAction(
  leagueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const access = await getLeagueAccess(leagueId, user.sub);
  if (!can(access, "league.manage")) return { error: "Sem permissão para editar a liga." };

  const parsed = leagueUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const league = await db.league.update({
    where: { id: leagueId },
    data: {
      name: data.name,
      season: data.season,
      description: data.description ?? null,
      city: data.city ?? null,
      state: data.state?.toUpperCase() ?? null,
      logoUrl: data.logoUrl ?? null,
      bannerUrl: data.bannerUrl ?? null,
      startDate: parseDate(data.startDate),
      endDate: parseDate(data.endDate),
      status: data.status,
    },
  });

  revalidatePath(`/ligas/${league.slug}`, "layout");
  return { success: "Liga atualizada." };
}

const aboutSchema = z.object({
  history: optional(z.string().trim()),
  organizers: optional(z.string().trim()),
  contact: optional(z.string().trim()),
});

export async function updateLeagueAboutAction(
  leagueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const access = await getLeagueAccess(leagueId, user.sub);
  if (!can(access, "league.manage")) return { error: "Sem permissão." };

  const parsed = aboutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const league = await db.league.update({
    where: { id: leagueId },
    data: {
      history: parsed.data.history ?? null,
      organizers: parsed.data.organizers ?? null,
      contact: parsed.data.contact ?? null,
    },
  });

  revalidatePath(`/ligas/${league.slug}/sobre`);
  return { success: "Informações atualizadas." };
}

const announcementSchema = z.object({
  title: z.string().trim().min(2, "Informe o título"),
  content: z.string().trim().min(2, "Informe o conteúdo"),
  pinned: z.preprocess((v) => v === "on", z.boolean()),
});

export async function createAnnouncementAction(
  leagueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const access = await getLeagueAccess(leagueId, user.sub);
  if (!can(access, "league.manage")) return { error: "Sem permissão." };

  const parsed = announcementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const league = await db.league.findUniqueOrThrow({ where: { id: leagueId } });
  await db.announcement.create({ data: { leagueId, ...parsed.data } });

  revalidatePath(`/ligas/${league.slug}`);
  return { success: "Aviso publicado." };
}

export async function deleteAnnouncementAction(leagueId: string, id: string) {
  const user = await requireUser();
  const access = await getLeagueAccess(leagueId, user.sub);
  if (!can(access, "league.manage")) return;

  const league = await db.league.findUniqueOrThrow({ where: { id: leagueId } });
  await db.announcement.deleteMany({ where: { id, leagueId } });
  revalidatePath(`/ligas/${league.slug}`);
}
