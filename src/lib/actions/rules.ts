"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getLeagueAccess, can } from "@/lib/permissions";
import { LEAGUE_FORMAT, TIEBREAKER, type Tiebreaker } from "@/lib/domain/enums";
import type { ActionState } from "./league";

const int = (min: number, max: number, message: string) =>
  z.preprocess((v) => Number(v), z.number().int().min(min).max(max, message));

const rulesSchema = z.object({
  format: z.enum(Object.keys(LEAGUE_FORMAT) as [string, ...string[]]),
  pointsWin: int(0, 10, "Pontuação por vitória inválida"),
  pointsDraw: int(0, 10, "Pontuação por empate inválida"),
  pointsLoss: int(0, 10, "Pontuação por derrota inválida"),
  legs: int(1, 4, "Quantidade de turnos deve ser entre 1 e 4"),
  playoffLegs: int(1, 2, "Mata-mata deve ser em 1 ou 2 jogos"),
  hasRepechage: z.preprocess((v) => v === "on", z.boolean()),
  matchDuration: int(1, 120, "Tempo de jogo inválido"),
  periods: int(1, 4, "Quantidade de tempos inválida"),
  intervalMinutes: int(0, 60, "Intervalo inválido"),
  extraTime: int(0, 60, "Prorrogação inválida"),
  penaltiesCount: int(1, 10, "Quantidade de pênaltis inválida"),
  maxAthletes: int(5, 30, "Máximo de atletas inválido"),
  minAthletes: int(2, 30, "Mínimo de atletas inválido"),
  yellowLimit: int(1, 10, "Limite de amarelos inválido"),
  redSuspension: int(0, 10, "Suspensão por vermelho inválida"),
  notes: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().trim().optional(),
  ),
});

export async function updateRulesAction(
  leagueId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const access = await getLeagueAccess(leagueId, user.sub);
  if (!can(access, "league.manage")) return { error: "Sem permissão para alterar as regras." };

  const parsed = rulesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (d.minAthletes > d.maxAthletes) {
    return { error: "O mínimo de atletas não pode ser maior que o máximo." };
  }

  // Critérios de desempate: campos tiebreaker-0..n em ordem, ignorando vazios e repetidos.
  const validKeys = new Set(Object.keys(TIEBREAKER));
  const tiebreakers: Tiebreaker[] = [];
  for (let i = 0; i < validKeys.size; i++) {
    const value = formData.get(`tiebreaker-${i}`);
    if (typeof value === "string" && validKeys.has(value) && !tiebreakers.includes(value as Tiebreaker)) {
      tiebreakers.push(value as Tiebreaker);
    }
  }
  if (tiebreakers.length === 0 || tiebreakers[0] !== "PONTOS") {
    return { error: "O primeiro critério de desempate deve ser Pontos." };
  }

  const league = await db.league.findUniqueOrThrow({ where: { id: leagueId } });
  await db.leagueRules.upsert({
    where: { leagueId },
    create: { leagueId, ...d, notes: d.notes ?? null, tiebreakers: JSON.stringify(tiebreakers) },
    update: { ...d, notes: d.notes ?? null, tiebreakers: JSON.stringify(tiebreakers) },
  });

  revalidatePath(`/ligas/${league.slug}`, "layout");
  return { success: "Regras atualizadas. A classificação já reflete a nova configuração." };
}
