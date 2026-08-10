import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Igrejas" };

export default async function ChurchesPage() {
  const churches = await db.church.findMany({
    include: { _count: { select: { athletes: true, leagueTeams: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Igrejas"
        description="Todas as igrejas cadastradas na plataforma. Cada igreja pode participar de várias ligas."
        actions={<ButtonLink href="/igrejas/nova">+ Nova Igreja</ButtonLink>}
      />

      {churches.length === 0 ? (
        <EmptyState
          icon="⛪"
          title="Nenhuma igreja cadastrada"
          description="Cadastre a primeira igreja para montar as equipes do campeonato."
          action={<ButtonLink href="/igrejas/nova">Cadastrar igreja</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {churches.map((church) => (
            <Link key={church.id} href={`/igrejas/${church.id}`} className="group">
              <Card className="flex h-full items-center gap-4 p-4 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-brand-300 group-hover:shadow-md animate-fade-up">
                <Avatar name={church.name} src={church.crestUrl} shape="shield" size="lg" />
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-zinc-900 group-hover:text-brand-800">
                    {church.name}
                  </h3>
                  <p className="truncate text-xs text-zinc-500">
                    {church.denomination} · {church.city}/{church.state}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {church._count.athletes} atletas · {church._count.leagueTeams} ligas
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
