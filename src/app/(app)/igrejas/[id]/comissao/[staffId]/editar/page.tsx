import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canManageChurch } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { updateStaffAction } from "@/lib/actions/church";
import { StaffEditForm } from "./staff-edit-form";

export const metadata: Metadata = { title: "Editar Comissão" };

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string; staffId: string }>;
}) {
  const { id, staffId } = await params;
  const user = await requireUser();
  const staff = await db.staffMember.findUnique({
    where: { id: staffId },
    include: { church: true },
  });
  if (!staff || staff.churchId !== id) notFound();
  if (!(await canManageChurch(user.sub, staff.churchId))) redirect(`/igrejas/${id}`);

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <PageHeader
        title={`Editar ${staff.name}`}
        description={`Comissão técnica de ${staff.church.name}.`}
      />
      <Card>
        <CardContent className="pt-5">
          <StaffEditForm action={updateStaffAction.bind(null, staff.id)} initial={staff} />
        </CardContent>
      </Card>
    </main>
  );
}
