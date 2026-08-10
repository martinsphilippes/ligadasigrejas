import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createAthleteAction } from "@/lib/actions/church";
import { AthleteForm } from "@/components/forms/athlete-form";

export const metadata: Metadata = { title: "Novo Atleta" };

export default async function NewAthletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const church = await db.church.findUnique({ where: { id } });
  if (!church) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Novo Atleta"
        description={`Cadastrar atleta no elenco de ${church.name}.`}
      />
      <Card>
        <CardContent className="pt-5">
          <AthleteForm
            action={createAthleteAction.bind(null, church.id)}
            submitLabel="Cadastrar atleta"
          />
        </CardContent>
      </Card>
    </main>
  );
}
