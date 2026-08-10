import { requireUser } from "@/lib/auth/session";
import { getPlatformRole } from "@/lib/permissions";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const role = await getPlatformRole(user.sub);

  return (
    <div className="min-h-dvh">
      <Topbar user={user} isAdmin={role === "ADMIN"} />
      {children}
    </div>
  );
}
