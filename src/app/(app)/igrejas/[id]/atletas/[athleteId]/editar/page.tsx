import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { updateAthleteAction } from "@/lib/actions/church";
import { AthleteForm } from "@/components/forms/athlete-form";

export const metadata: Metadata = { title: "Editar Atleta" };

export default async function EditAthletePage({
  params,
}: {
  params: Promise<{ id: string; athleteId: string }>;
}) {
  const { id, athleteId } = await params;
  const athlete = await db.athlete.findUnique({
    where: { id: athleteId },
    include: { church: true },
  });
  if (!athlete || athlete.churchId !== id) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader
        title={`Editar ${athlete.name}`}
        description={`Elenco de ${athlete.church.name}.`}
      />
      <Card>
        <CardContent className="pt-5">
          <AthleteForm
            action={updateAthleteAction.bind(null, athlete.id)}
            initial={athlete}
            submitLabel="Salvar alterações"
          />
        </CardContent>
      </Card>
    </main>
  );
}
