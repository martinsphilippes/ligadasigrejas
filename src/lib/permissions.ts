import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { MemberRole } from "@/lib/domain/enums";

// Capacidades por papel — a autorização das telas e ações consulta capacidades,
// nunca papéis diretamente, para que novos papéis não exijam mudanças espalhadas.
export type Capability =
  | "league.manage" // editar liga, regras, sobre, avisos, organizadores
  | "teams.manage" // inscrever/remover equipes da liga
  | "schedule.manage" // criar/editar jogos, rodadas, quadras, agenda
  | "results.record" // registrar placar, gols, cartões, WO
  | "church.manage" // editar dados da própria igreja e elenco
  | "squad.manage"; // gerenciar elenco (titulares/reservas/comissão)

const ROLE_CAPABILITIES: Record<MemberRole, Capability[]> = {
  ORGANIZADOR_GERAL: [
    "league.manage",
    "teams.manage",
    "schedule.manage",
    "results.record",
    "church.manage",
    "squad.manage",
  ],
  ORGANIZADOR_IGREJA: ["church.manage", "squad.manage"],
  ADMIN_EQUIPE: ["squad.manage"],
  MESARIO: ["results.record"],
  ARBITRO: ["results.record"],
};

export interface LeagueAccess {
  isOwner: boolean;
  roles: MemberRole[];
  /** Igrejas às quais os papéis do usuário estão vinculados */
  churchIds: string[];
  capabilities: Set<Capability>;
}

/** Acesso do usuário em uma liga (dono tem todas as capacidades). */
export const getLeagueAccess = cache(
  async (leagueId: string, userId: string): Promise<LeagueAccess> => {
    const [league, memberships] = await Promise.all([
      db.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } }),
      db.leagueMember.findMany({ where: { leagueId, userId } }),
    ]);

    const isOwner = league?.ownerId === userId;
    const roles = memberships.map((m) => m.role as MemberRole);
    const capabilities = new Set<Capability>();
    if (isOwner) {
      (Object.keys(ROLE_CAPABILITIES) as MemberRole[]).forEach((r) =>
        ROLE_CAPABILITIES[r].forEach((c) => capabilities.add(c)),
      );
    }
    for (const role of roles) {
      (ROLE_CAPABILITIES[role] ?? []).forEach((c) => capabilities.add(c));
    }

    return {
      isOwner,
      roles,
      churchIds: memberships.flatMap((m) => (m.churchId ? [m.churchId] : [])),
      capabilities,
    };
  },
);

export function can(access: LeagueAccess, capability: Capability): boolean {
  return access.capabilities.has(capability);
}

/**
 * Capacidade sobre uma igreja específica: organizadores gerais/donos podem tudo;
 * papéis de igreja valem apenas para a igreja vinculada.
 */
export function canForChurch(
  access: LeagueAccess,
  capability: Capability,
  churchId: string,
): boolean {
  if (access.isOwner || access.roles.includes("ORGANIZADOR_GERAL")) return true;
  return access.capabilities.has(capability) && access.churchIds.includes(churchId);
}
