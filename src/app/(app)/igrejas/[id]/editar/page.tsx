import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canManageChurch } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { updateChurchAction } from "@/lib/actions/church";
import { ChurchForm } from "@/components/forms/church-form";

export const metadata: Metadata = { title: "Editar Igreja" };

export default async function EditChurchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const church = await db.church.findUnique({ where: { id } });
  if (!church) notFound();
  if (!(await canManageChurch(user.sub, church.id))) redirect(`/igrejas/${church.id}`);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader title={`Editar ${church.name}`} />
      <Card>
        <CardContent className="pt-5">
          <ChurchForm
            action={updateChurchAction.bind(null, church.id)}
            initial={church}
            submitLabel="Salvar alterações"
          />
        </CardContent>
      </Card>
    </main>
  );
}
