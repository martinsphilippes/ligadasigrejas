import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getPlatformRole } from "@/lib/permissions";
import {
  PLATFORM_ROLE,
  PLATFORM_ROLE_DESCRIPTIONS,
  type PlatformRole,
} from "@/lib/domain/enums";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { setUserRoleAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Usuários" };

export default async function AdminUsersPage() {
  const me = await requireUser();
  if ((await getPlatformRole(me.sub)) !== "ADMIN") redirect("/");

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { ownedLeagues: true, memberships: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Usuários da plataforma"
        description="Defina quem pode organizar campeonatos. Membros apenas participam e acompanham."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardContent className="pt-2">
            <ul className="divide-y divide-zinc-100">
              {users.map((user) => (
                <li key={user.id} className="flex items-center gap-3 py-3">
                  <Avatar name={user.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {user.name}
                      {user.id === me.sub && (
                        <span className="ml-2 text-xs font-normal text-zinc-400">(você)</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {user.email} · desde {formatDate(user.createdAt)}
                      {user._count.ownedLeagues > 0 && ` · ${user._count.ownedLeagues} liga(s)`}
                    </p>
                  </div>
                  {user.id === me.sub ? (
                    <Badge tone="gold">{PLATFORM_ROLE[user.role as PlatformRole] ?? user.role}</Badge>
                  ) : (
                    <form
                      action={setUserRoleAction.bind(null, user.id)}
                      className="flex items-center gap-1.5"
                    >
                      <select
                        name="role"
                        defaultValue={user.role}
                        className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700"
                      >
                        {Object.entries(PLATFORM_ROLE).map(([value, text]) => (
                          <option key={value} value={value}>
                            {text}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                      >
                        Salvar
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Papéis</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3.5">
              {(Object.keys(PLATFORM_ROLE) as PlatformRole[]).map((role) => (
                <div key={role}>
                  <dt className="text-sm font-semibold text-zinc-800">
                    {PLATFORM_ROLE[role]}
                  </dt>
                  <dd className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                    {PLATFORM_ROLE_DESCRIPTIONS[role]}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-400">
              Papéis dentro de cada liga (mesário, árbitro, administrador de equipe...)
              são definidos na tela Organização da própria liga.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
