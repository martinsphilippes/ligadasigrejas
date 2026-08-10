import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { label, POSITIONS_BY_SPORT } from "@/lib/domain/enums";
import { calcAge } from "@/lib/utils";
import {
  toggleSquadRoleAction,
  deleteAthleteAction,
} from "@/lib/actions/church";
import { ConfirmButton } from "@/components/ui/confirm-button";

export interface AthleteCardData {
  id: string;
  churchId: string;
  name: string;
  photoUrl: string | null;
  shirtNumber: number | null;
  position: string | null;
  birthDate: Date | null;
  squadRole: string;
}

/** Cartão de atleta com ações de organização do elenco. */
export function AthleteCard({
  athlete,
  canManage,
  sportSlug = "futsal",
}: {
  athlete: AthleteCardData;
  canManage: boolean;
  sportSlug?: string;
}) {
  const age = calcAge(athlete.birthDate);
  const positions = POSITIONS_BY_SPORT[sportSlug] ?? {};

  return (
    <Card className="flex items-center gap-3 p-3.5 animate-fade-up">
      <div className="relative">
        <Avatar name={athlete.name} src={athlete.photoUrl} size="md" />
        {athlete.shirtNumber != null && (
          <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-brand-800 text-[10px] font-bold text-white ring-2 ring-white">
            {athlete.shirtNumber}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900">{athlete.name}</p>
        <p className="truncate text-xs text-zinc-500">
          {label(positions, athlete.position, "Sem posição")}
          {age != null && ` · ${age} anos`}
        </p>
      </div>
      {canManage && (
        <div className="flex shrink-0 items-center gap-1">
          <form action={toggleSquadRoleAction.bind(null, athlete.id)}>
            <button
              type="submit"
              title={athlete.squadRole === "TITULAR" ? "Mover para reservas" : "Promover a titular"}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              {athlete.squadRole === "TITULAR" ? "↓ Reserva" : "↑ Titular"}
            </button>
          </form>
          <Link
            href={`/igrejas/${athlete.churchId}/atletas/${athlete.id}/editar`}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
          >
            Editar
          </Link>
          <form action={deleteAthleteAction.bind(null, athlete.id)}>
            <ConfirmButton
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-[11px] text-red-500 hover:bg-red-50 hover:text-red-700"
              message={`Remover ${athlete.name} do elenco?`}
            >
              Remover
            </ConfirmButton>
          </form>
        </div>
      )}
    </Card>
  );
}
