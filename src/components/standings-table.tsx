import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { StandingsEntry } from "@/lib/data/standings";

/** Tabela de classificação completa, com destaque opcional para uma equipe. */
export function StandingsTable({
  standings,
  leagueSlug,
  highlightTeamId,
  compact = false,
}: {
  standings: StandingsEntry[];
  leagueSlug: string;
  highlightTeamId?: string;
  compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-900/[0.03]">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            <th className="py-2.5 pl-4 pr-2 text-center">#</th>
            <th className="px-2 py-2.5">Equipe</th>
            <th className="px-2 py-2.5 text-center font-bold text-zinc-600">P</th>
            <th className="px-2 py-2.5 text-center">J</th>
            <th className="px-2 py-2.5 text-center">V</th>
            <th className="px-2 py-2.5 text-center">E</th>
            <th className="px-2 py-2.5 text-center">D</th>
            {!compact && (
              <>
                <th className="px-2 py-2.5 text-center">GP</th>
                <th className="px-2 py-2.5 text-center">GC</th>
              </>
            )}
            <th className="px-2 py-2.5 text-center">SG</th>
            <th className="px-2 py-2.5 text-center">%</th>
            {!compact && <th className="py-2.5 pl-2 pr-4 text-right">Últimas</th>}
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr
              key={row.teamId}
              className={cn(
                "border-b border-zinc-100 last:border-0 transition-colors hover:bg-zinc-50/70",
                row.teamId === highlightTeamId && "bg-brand-50/60 hover:bg-brand-50",
              )}
            >
              <td className="py-2.5 pl-4 pr-2 text-center">
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-md text-xs font-bold",
                    row.position === 1
                      ? "bg-gold-500 text-brand-950"
                      : row.position <= 4
                        ? "bg-brand-100 text-brand-800"
                        : "text-zinc-500",
                  )}
                >
                  {row.position}
                </span>
              </td>
              <td className="px-2 py-2.5">
                <Link
                  href={`/ligas/${leagueSlug}/equipes/${row.teamId}`}
                  className="flex items-center gap-2.5 font-medium text-zinc-800 hover:text-brand-800"
                >
                  <Avatar name={row.churchName} src={row.crestUrl} shape="shield" size="xs" />
                  <span className="truncate">{row.churchName}</span>
                  {row.group && (
                    <span className="rounded bg-zinc-100 px-1.5 text-[10px] font-semibold text-zinc-500">
                      Grupo {row.group}
                    </span>
                  )}
                </Link>
              </td>
              <td className="px-2 py-2.5 text-center font-bold tabular-nums text-zinc-900">
                {row.points}
              </td>
              <td className="px-2 py-2.5 text-center tabular-nums text-zinc-500">{row.played}</td>
              <td className="px-2 py-2.5 text-center tabular-nums text-zinc-500">{row.wins}</td>
              <td className="px-2 py-2.5 text-center tabular-nums text-zinc-500">{row.draws}</td>
              <td className="px-2 py-2.5 text-center tabular-nums text-zinc-500">{row.losses}</td>
              {!compact && (
                <>
                  <td className="px-2 py-2.5 text-center tabular-nums text-zinc-500">
                    {row.goalsFor}
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums text-zinc-500">
                    {row.goalsAgainst}
                  </td>
                </>
              )}
              <td
                className={cn(
                  "px-2 py-2.5 text-center font-medium tabular-nums",
                  row.goalDiff > 0
                    ? "text-brand-700"
                    : row.goalDiff < 0
                      ? "text-red-600"
                      : "text-zinc-500",
                )}
              >
                {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
              </td>
              <td className="px-2 py-2.5 text-center tabular-nums text-zinc-500">
                {row.efficiency}%
              </td>
              {!compact && (
                <td className="py-2.5 pl-2 pr-4">
                  <div className="flex justify-end gap-1">
                    {row.form.length === 0 ? (
                      <span className="text-xs text-zinc-300">—</span>
                    ) : (
                      row.form.map((r, i) => <FormDot key={i} result={r} />)
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormDot({ result }: { result: "V" | "E" | "D" }) {
  const styles = {
    V: "bg-brand-600 text-white",
    E: "bg-zinc-300 text-zinc-700",
    D: "bg-red-500 text-white",
  } as const;
  return (
    <span
      className={cn(
        "flex size-4.5 items-center justify-center rounded-full text-[9px] font-bold",
        styles[result],
      )}
      title={result === "V" ? "Vitória" : result === "E" ? "Empate" : "Derrota"}
    >
      {result}
    </span>
  );
}
