import { requireUser } from "@/lib/auth/session";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh">
      <Topbar user={user} />
      {children}
    </div>
  );
}
