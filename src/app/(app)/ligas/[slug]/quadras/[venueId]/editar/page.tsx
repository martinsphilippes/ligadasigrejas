import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getLeagueContext } from "@/lib/data/league";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { updateVenueAction } from "@/lib/actions/schedule";
import { VenueForm } from "../../venue-form";

export const metadata: Metadata = { title: "Editar Quadra" };

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ slug: string; venueId: string }>;
}) {
  const { slug, venueId } = await params;
  const { league, access } = await getLeagueContext(slug);
  if (!can(access, "schedule.manage")) redirect(`/ligas/${league.slug}/quadras`);

  const venue = await db.venue.findUnique({ where: { id: venueId } });
  if (!venue || venue.leagueId !== league.id) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Editar ${venue.name}`} />
      <Card>
        <CardContent className="pt-5">
          <VenueForm
            action={updateVenueAction.bind(null, league.id, venue.id)}
            initial={venue}
            submitLabel="Salvar alterações"
          />
        </CardContent>
      </Card>
    </div>
  );
}
