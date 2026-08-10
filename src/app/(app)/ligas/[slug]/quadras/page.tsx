/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getLeagueContext } from "@/lib/data/league";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { deleteVenueAction } from "@/lib/actions/schedule";
import { VenueForm } from "./venue-form";

export const metadata: Metadata = { title: "Quadras" };

export default async function VenuesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { league, access } = await getLeagueContext(slug);
  const manage = can(access, "schedule.manage");

  const venues = await db.venue.findMany({
    where: { leagueId: league.id },
    include: { _count: { select: { matches: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Quadras"
        description="Locais onde os jogos da liga são realizados."
      />

      {manage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nova quadra</CardTitle>
          </CardHeader>
          <CardContent>
            <VenueForm leagueId={league.id} />
          </CardContent>
        </Card>
      )}

      {venues.length === 0 ? (
        <EmptyState
          icon="🏟"
          title="Nenhuma quadra cadastrada"
          description="Cadastre as quadras para vinculá-las aos jogos da agenda."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {venues.map((venue) => (
            <Card key={venue.id} className="overflow-hidden animate-fade-up">
              {venue.photoUrl && (
                <img
                  src={venue.photoUrl}
                  alt={venue.name}
                  className="h-36 w-full object-cover"
                />
              )}
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-zinc-900">{venue.name}</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {[venue.address, venue.city && `${venue.city}${venue.state ? `/${venue.state}` : ""}`]
                        .filter(Boolean)
                        .join(" · ") || "Endereço não informado"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-500">
                    {venue._count.matches} jogos
                  </span>
                </div>
                {venue.description && (
                  <p className="mt-2 text-sm text-zinc-600">{venue.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5">
                  {venue.mapUrl ? (
                    <a
                      href={venue.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      📍 Ver localização
                    </a>
                  ) : (
                    <span />
                  )}
                  {manage && (
                    <form action={deleteVenueAction.bind(null, league.id, venue.id)}>
                      <ConfirmButton
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-[11px] text-red-500 hover:bg-red-50"
                        message={`Excluir a quadra ${venue.name}?`}
                      >
                        Excluir
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
