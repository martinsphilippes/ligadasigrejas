import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { MatchStatusBadge } from "@/components/ui/badge";
import { cn, formatRelativeDay, formatTime } from "@/lib/utils";

export interface MatchCardData {
  id: string;
  scheduledAt: Date | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  woWinnerId: string | null;
  homeTeam: { id: string; church: { name: string; crestUrl: string | null } };
  awayTeam: { id: string; church: { name: string; crestUrl: string | null } };
  venue?: { name: string } | null;
  round?: { name: string | null; number: number } | null;
}

/** Linha/cartão de partida usado em jogos, rodadas, agenda e dashboard. */
export function MatchCard({
  match,
  leagueSlug,
  showRound = false,
}: {
  match: MatchCardData;
  leagueSlug: string;
  showRound?: boolean;
}) {
  const finished = match.status === "FINALIZADO" || match.status === "WO";
  const isWo = match.status === "WO";

  return (
    <Link
      href={`/ligas/${leagueSlug}/jogos/${match.id}`}
      className="group block animate-fade-up"
    >
      <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-900/[0.03] transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-brand-300 group-hover:shadow-md group-active:scale-[0.98] group-active:border-brand-500 group-active:bg-brand-50/50">
        <div className="mb-2.5 flex items-center justify-between gap-2 text-xs text-zinc-400">
          <span>
            {showRound && match.round && `${match.round.name ?? `Rodada ${match.round.number}`} · `}
            {match.scheduledAt
              ? `${formatRelativeDay(match.scheduledAt)} · ${formatTime(match.scheduledAt)}`
              : "Data a definir"}
            {match.venue && ` · ${match.venue.name}`}
          </span>
          <MatchStatusBadge status={match.status} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamSide
            name={match.homeTeam.church.name}
            crest={match.homeTeam.church.crestUrl}
            winner={isWo && match.woWinnerId === match.homeTeam.id}
            align="right"
          />
          <div className="text-center">
            {finished ? (
              <div>
                <span className="text-xl font-bold tabular-nums tracking-tight text-zinc-900">
                  {isWo
                    ? match.woWinnerId === match.homeTeam.id
                      ? "3 – 0"
                      : "0 – 3"
                    : `${match.homeScore} – ${match.awayScore}`}
                </span>
                {match.homePenalties != null && match.awayPenalties != null && (
                  <p className="text-[10px] text-zinc-400">
                    ({match.homePenalties} – {match.awayPenalties} pên.)
                  </p>
                )}
              </div>
            ) : (
              <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500">
                VS
              </span>
            )}
          </div>
          <TeamSide
            name={match.awayTeam.church.name}
            crest={match.awayTeam.church.crestUrl}
            winner={isWo && match.woWinnerId === match.awayTeam.id}
            align="left"
          />
        </div>
      </div>
    </Link>
  );
}

function TeamSide({
  name,
  crest,
  winner,
  align,
}: {
  name: string;
  crest: string | null;
  winner: boolean;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <Avatar name={name} src={crest} shape="shield" size="sm" />
      <span
        className={cn(
          "truncate text-sm font-medium text-zinc-800",
          winner && "font-bold text-brand-800",
        )}
      >
        {name}
        {winner && " ✓"}
      </span>
    </div>
  );
}
