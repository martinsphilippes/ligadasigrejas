import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getPlatformRole, isPlatformOrganizer } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createChurchAction } from "@/lib/actions/church";
import { ChurchForm } from "@/components/forms/church-form";

export const metadata: Metadata = { title: "Nova Igreja" };

export default async function NewChurchPage() {
  const user = await requireUser();
  if (!isPlatformOrganizer(await getPlatformRole(user.sub))) redirect("/igrejas");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Nova Igreja"
        description="Cadastre a igreja com os dados de contato e identidade da equipe."
      />
      <Card>
        <CardContent className="pt-5">
          <ChurchForm action={createChurchAction} submitLabel="Cadastrar igreja" />
        </CardContent>
      </Card>
    </main>
  );
}
