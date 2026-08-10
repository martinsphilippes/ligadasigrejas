import type { Metadata } from "next";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getLeagueContext } from "@/lib/data/league";
import { can } from "@/lib/permissions";
import { cn, formatLongDate, formatTime } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { MatchCard } from "@/components/match-card";

export const metadata: Metadata = { title: "Agenda" };

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ visao?: string; mes?: string }>;
}) {
  const { slug } = await params;
  const { visao = "calendario", mes } = await searchParams;
  const { league, access } = await getLeagueContext(slug);

  const month = mes
    ? parse(mes, "yyyy-MM", new Date())
    : new Date();

  const matches = await db.match.findMany({
    where: { leagueId: league.id },
    include: {
      homeTeam: { include: { church: true } },
      awayTeam: { include: { church: true } },
      venue: true,
      round: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  const scheduled = matches.filter((m) => m.scheduledAt != null);
  const unscheduled = matches.filter(
    (m) => m.scheduledAt == null && m.status === "AGENDADO",
  );

  const base = `/ligas/${league.slug}/agenda`;

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Calendário de jogos da liga. Datas, horários e quadras são editáveis em cada jogo."
        actions={
          can(access, "schedule.manage") && (
            <ButtonLink href={`/ligas/${league.slug}/jogos/novo`}>+ Criar jogo</ButtonLink>
          )
        }
      />

      {/* Alternância de visão */}
      <div className="mb-5 flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        <Link
          href={base}
          className={cn(
            "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
            visao === "calendario"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800",
          )}
        >
          📅 Calendário
        </Link>
        <Link
          href={`${base}?visao=lista`}
          className={cn(
            "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
            visao === "lista"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800",
          )}
        >
          ☰ Lista
        </Link>
      </div>

      {visao === "lista" ? (
        <ListView matches={scheduled} unscheduled={unscheduled} leagueSlug={league.slug} />
      ) : (
        <CalendarView
          month={month}
          matches={scheduled}
          base={base}
          leagueSlug={league.slug}
        />
      )}
    </div>
  );
}

type MatchWithTeams = Prisma.MatchGetPayload<{
  include: {
    homeTeam: { include: { church: true } };
    awayTeam: { include: { church: true } };
    venue: true;
    round: true;
  };
}>;

function CalendarView({
  month,
  matches,
  base,
  leagueSlug,
}: {
  month: Date;
  matches: MatchWithTeams[];
  base: string;
  leagueSlug: string;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });
  const prev = format(addMonths(month, -1), "yyyy-MM");
  const next = format(addMonths(month, 1), "yyyy-MM");

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`${base}?mes=${prev}`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
        >
          ← Anterior
        </Link>
        <h2 className="font-bold capitalize tracking-tight text-zinc-900">
          {format(month, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <Link
          href={`${base}?mes=${next}`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
        >
          Próximo →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-zinc-200">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div
            key={d}
            className="bg-zinc-50 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dayMatches = matches.filter(
            (m) => m.scheduledAt && isSameDay(m.scheduledAt, day),
          );
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-20 bg-white p-1.5",
                !isSameMonth(day, month) && "bg-zinc-50/70 text-zinc-300",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday(day)
                    ? "bg-brand-700 font-bold text-white"
                    : "text-zinc-500",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-1">
                {dayMatches.map((m) => (
                  <Link
                    key={m.id}
                    href={`/ligas/${leagueSlug}/jogos/${m.id}`}
                    title={`${m.homeTeam.church.name} × ${m.awayTeam.church.name}`}
                    className={cn(
                      "block truncate rounded px-1.5 py-1 text-[10px] font-medium leading-tight transition-colors",
                      m.status === "FINALIZADO" || m.status === "WO"
                        ? "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                        : m.status === "CANCELADO"
                          ? "bg-red-50 text-red-500 line-through"
                          : "bg-brand-100 text-brand-800 hover:bg-brand-200",
                    )}
                  >
                    {formatTime(m.scheduledAt)} {m.homeTeam.church.name.split(" ")[0]} ×{" "}
                    {m.awayTeam.church.name.split(" ")[0]}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({
  matches,
  unscheduled,
  leagueSlug,
}: {
  matches: MatchWithTeams[];
  unscheduled: MatchWithTeams[];
  leagueSlug: string;
}) {
  if (matches.length === 0 && unscheduled.length === 0) {
    return (
      <EmptyState
        icon="📅"
        title="Agenda vazia"
        description="Gere a tabela em Rodadas ou crie jogos para montar a agenda."
      />
    );
  }

  // Agrupa por dia
  const byDay = new Map<string, MatchWithTeams[]>();
  for (const m of matches) {
    const key = format(m.scheduledAt!, "yyyy-MM-dd");
    byDay.set(key, [...(byDay.get(key) ?? []), m]);
  }

  return (
    <div className="space-y-8">
      {[...byDay.entries()].map(([day, dayMatches]) => (
        <section key={day}>
          <h2 className="mb-3 text-sm font-bold capitalize tracking-wide text-zinc-700">
            {formatLongDate(dayMatches[0].scheduledAt!)}
          </h2>
          <div className="grid gap-2.5 xl:grid-cols-2">
            {dayMatches.map((m) => (
              <MatchCard key={m.id} match={m} leagueSlug={leagueSlug} showRound />
            ))}
          </div>
        </section>
      ))}

      {unscheduled.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold tracking-wide text-zinc-700">
            ⏳ Sem data definida ({unscheduled.length})
          </h2>
          <div className="grid gap-2.5 xl:grid-cols-2">
            {unscheduled.map((m) => (
              <MatchCard key={m.id} match={m} leagueSlug={leagueSlug} showRound />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
