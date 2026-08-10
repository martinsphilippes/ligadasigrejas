import { cn } from "@/lib/utils";
import type { LeagueStatus, MatchStatus } from "@/lib/domain/enums";
import { LEAGUE_STATUS, MATCH_STATUS } from "@/lib/domain/enums";

type Tone = "neutral" | "green" | "gold" | "red" | "blue" | "zinc";

const tones: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-700",
  green: "bg-brand-100 text-brand-800",
  gold: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-800",
  zinc: "bg-zinc-100 text-zinc-500",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

const leagueStatusTone: Record<LeagueStatus, Tone> = {
  INSCRICOES: "blue",
  EM_ANDAMENTO: "green",
  PAUSADA: "gold",
  ENCERRADA: "zinc",
};

export function LeagueStatusBadge({ status }: { status: string }) {
  const s = status as LeagueStatus;
  return <Badge tone={leagueStatusTone[s] ?? "neutral"}>{LEAGUE_STATUS[s] ?? status}</Badge>;
}

const matchStatusTone: Record<MatchStatus, Tone> = {
  AGENDADO: "blue",
  EM_ANDAMENTO: "green",
  FINALIZADO: "neutral",
  WO: "gold",
  ADIADO: "gold",
  CANCELADO: "red",
};

export function MatchStatusBadge({ status }: { status: string }) {
  const s = status as MatchStatus;
  return <Badge tone={matchStatusTone[s] ?? "neutral"}>{MATCH_STATUS[s] ?? status}</Badge>;
}
