import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { PLATFORM_ROLE, type PlatformRole } from "@/lib/domain/enums";
import { isOwnerEmail } from "@/lib/config";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForm, PasswordForm } from "./profile-forms";

export const metadata: Metadata = { title: "Meu Perfil" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = isOwnerEmail(user.email) ? "ADMIN" : (user.role as PlatformRole);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader title="Meu Perfil" description="Seus dados de acesso à plataforma." />

      <div className="mb-6 flex items-center gap-4 animate-fade-up">
        <Avatar name={user.name} src={user.avatarUrl} size="xl" />
        <div>
          <h2 className="text-lg font-bold text-zinc-900">{user.name}</h2>
          <p className="text-sm text-zinc-500">{user.email}</p>
          <Badge tone={isOwnerEmail(user.email) ? "gold" : "green"} className="mt-1">
            {isOwnerEmail(user.email) ? "👑 Dono do app" : PLATFORM_ROLE[role] ?? role}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm initial={{ name: user.name, avatarUrl: user.avatarUrl ?? "" }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alterar senha</CardTitle>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
