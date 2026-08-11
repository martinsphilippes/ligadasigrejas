import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canManageChurch } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createInternalMatchAction } from "@/lib/actions/internal";
import { NewInternalForm } from "./new-internal-form";

export const metadata: Metadata = { title: "Novo Jogo Interno" };

export default async function NewInternalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const church = await db.church.findUnique({
    where: { id },
    include: {
      athletes: {
        where: { active: true },
        orderBy: [{ squadRole: "desc" }, { name: "asc" }],
      },
    },
  });
  if (!church) notFound();
  if (!(await canManageChurch(user.sub, church.id))) {
    redirect(`/igrejas/${church.id}/interno`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Novo Jogo Interno"
        description={`Monte os times entre os irmãos de ${church.name}.`}
      />
      <Card>
        <CardContent className="pt-5">
          <NewInternalForm
            action={createInternalMatchAction.bind(null, church.id)}
            athletes={church.athletes.map((a) => ({
              id: a.id,
              name: a.name,
              photoUrl: a.photoUrl,
              squadRole: a.squadRole,
              position: a.position,
            }))}
          />
        </CardContent>
      </Card>
    </main>
  );
}
