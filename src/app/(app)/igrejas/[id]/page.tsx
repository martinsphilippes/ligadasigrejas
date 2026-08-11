/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import {
  canManageChurch,
  getPlatformRole,
  getUserLite,
  isPlatformOrganizer,
} from "@/lib/permissions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { AthleteCard } from "@/components/athlete-card";
import { StaffForm } from "@/components/forms/staff-form";
import {
  createStaffAction,
  deleteChurchAction,
  deleteStaffAction,
} from "@/lib/actions/church";
import { acceptJoinAction, rejectJoinAction } from "@/lib/actions/join";
import { formatDate } from "@/lib/utils";
import { JoinRequestCard } from "./join-request-card";

export default async function ChurchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const church = await db.church.findUnique({
    where: { id },
    include: {
      athletes: { where: { active: true }, orderBy: [{ squadRole: "desc" }, { name: "asc" }] },
      staff: { orderBy: { name: "asc" } },
      leagueTeams: { include: { league: true } },
    },
  });
  if (!church) notFound();

  const [manage, organizer, me, myRequest] = await Promise.all([
    canManageChurch(user.sub, church.id),
    getPlatformRole(user.sub).then(isPlatformOrganizer),
    getUserLite(user.sub).then((u) => u!),
    db.joinRequest.findUnique({
      where: { churchId_userId: { churchId: church.id, userId: user.sub } },
    }),
  ]);
  const pendingRequests = manage
    ? await db.joinRequest.findMany({
        where: { churchId: church.id, status: "PENDENTE" },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const titulares = church.athletes.filter((a) => a.squadRole === "TITULAR");
  const reservas = church.athletes.filter((a) => a.squadRole !== "TITULAR");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Cabeçalho da igreja */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 animate-fade-up">
        <div className="flex items-center gap-4">
          <Avatar name={church.name} src={church.crestUrl} shape="shield" size="xl" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {church.name}
            </h1>
            <p className="text-sm text-zinc-500">
              {church.denomination} · {church.city}/{church.state}
              {church.district && ` · ${church.district}`}
            </p>
            {church.pastorName && (
              <p className="mt-0.5 text-xs text-zinc-400">
                Pastor responsável: {church.pastorName}
              </p>
            )}
          </div>
        </div>
        {manage && (
          <div className="flex gap-2">
            <ButtonLink variant="secondary" href={`/igrejas/${church.id}/editar`}>
              Editar
            </ButtonLink>
            <ButtonLink href={`/igrejas/${church.id}/atletas/novo`}>+ Atleta</ButtonLink>
          </div>
        )}
      </div>

      {/* Solicitação de ingresso (visão do membro) */}
      {!manage && (
        <div className="mb-6">
          <JoinRequestCard
            churchId={church.id}
            churchName={church.name}
            status={(myRequest?.status as "PENDENTE" | "ACEITO" | "RECUSADO") ?? "NENHUMA"}
            isMyChurch={me.churchId === church.id}
          />
        </div>
      )}

      {/* Solicitações pendentes (visão do responsável) */}
      {manage && pendingRequests.length > 0 && (
        <Card className="mb-6 border-amber-200">
          <CardHeader>
            <CardTitle>🙋 Solicitações de ingresso ({pendingRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-zinc-100">
              {pendingRequests.map((req) => (
                <li key={req.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar name={req.user.name} src={req.user.avatarUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {req.user.name}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      {req.user.email} · pediu em {formatDate(req.createdAt)}
                    </p>
                    {req.message && (
                      <p className="mt-1 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-xs italic text-zinc-600">
                        &ldquo;{req.message}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={acceptJoinAction.bind(null, req.id)}>
                      <button
                        type="submit"
                        className="rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-brand-800 active:scale-[0.97]"
                      >
                        ✓ Aceitar
                      </button>
                    </form>
                    <form action={rejectJoinAction.bind(null, req.id)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-50 active:scale-[0.97]"
                      >
                        Recusar
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-zinc-400">
              Ao aceitar, a pessoa entra no elenco como reserva e a igreja passa a ser a equipe dela.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {/* Titulares */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Titulares <Badge tone="green">{titulares.length}</Badge>
            </h2>
            {titulares.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-400">
                Nenhum titular definido. Promova atletas do banco de reservas.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {titulares.map((a) => (
                  <AthleteCard key={a.id} athlete={a} canManage={manage} />
                ))}
              </div>
            )}
          </section>

          {/* Reservas */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Reservas <Badge>{reservas.length}</Badge>
            </h2>
            {reservas.length === 0 ? (
              church.athletes.length === 0 ? (
                <EmptyState
                  icon="👟"
                  title="Elenco vazio"
                  description={
                    manage
                      ? "Cadastre os atletas da igreja para montar a equipe."
                      : "Os atletas desta igreja ainda não foram cadastrados."
                  }
                  action={
                    manage && (
                      <ButtonLink href={`/igrejas/${church.id}/atletas/novo`}>
                        Cadastrar atleta
                      </ButtonLink>
                    )
                  }
                />
              ) : (
                <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-400">
                  Sem reservas no momento.
                </p>
              )
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {reservas.map((a) => (
                  <AthleteCard key={a.id} athlete={a} canManage={manage} />
                ))}
              </div>
            )}
          </section>

          {/* Comissão técnica */}
          <Card>
            <CardHeader>
              <CardTitle>Comissão técnica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {church.staff.length > 0 && (
                <ul className="divide-y divide-zinc-100">
                  {church.staff.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-2.5">
                      <Avatar name={s.name} src={s.photoUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">{s.name}</p>
                        <p className="text-xs text-zinc-500">{s.role}</p>
                      </div>
                      {manage && (
                        <Link
                          href={`/igrejas/${church.id}/comissao/${s.id}/editar`}
                          className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
                        >
                          Editar
                        </Link>
                      )}
                      {manage && (
                        <form action={deleteStaffAction.bind(null, s.id)}>
                          <ConfirmButton
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-[11px] text-red-500 hover:bg-red-50"
                            message={`Remover ${s.name} da comissão?`}
                          >
                            Remover
                          </ConfirmButton>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {manage ? (
                <StaffForm action={createStaffAction.bind(null, church.id)} />
              ) : (
                church.staff.length === 0 && (
                  <p className="text-sm text-zinc-400">Comissão ainda não cadastrada.</p>
                )
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {church.photoUrl && (
            <img
              src={church.photoUrl}
              alt={church.name}
              className="w-full rounded-xl border border-zinc-200 object-cover"
            />
          )}
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                {church.address && (
                  <InfoRow
                    label="Endereço"
                    value={[church.address, church.addressNumber].filter(Boolean).join(", ")}
                  />
                )}
                {church.zipCode && <InfoRow label="CEP" value={church.zipCode} />}
                {church.phone && <InfoRow label="Telefone" value={church.phone} />}
                {church.email && <InfoRow label="E-mail" value={church.email} />}
                <InfoRow label="Atletas no elenco" value={String(church.athletes.length)} />
              </dl>
              {church.description && (
                <p className="mt-4 border-t border-zinc-100 pt-3 text-sm leading-relaxed text-zinc-600">
                  {church.description}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ligas que participa</CardTitle>
            </CardHeader>
            <CardContent>
              {church.leagueTeams.length === 0 ? (
                <p className="text-sm text-zinc-400">Ainda não participa de nenhuma liga.</p>
              ) : (
                <ul className="space-y-2">
                  {church.leagueTeams.map((lt) => (
                    <li key={lt.id}>
                      <Link
                        href={`/ligas/${lt.league.slug}`}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-brand-800"
                      >
                        <Avatar name={lt.league.name} src={lt.league.logoUrl} shape="shield" size="xs" />
                        {lt.league.name}
                        <span className="ml-auto text-xs text-zinc-400">{lt.league.season}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {organizer && (
            <form action={deleteChurchAction.bind(null, church.id)} className="text-right">
              <ConfirmButton
                variant="ghost"
                size="sm"
                className="text-red-500 hover:bg-red-50 hover:text-red-700"
                message={`Excluir a igreja ${church.name}? Todos os atletas e participações em ligas serão removidos.`}
              >
                Excluir igreja
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-zinc-400">{label}</dt>
      <dd className="text-right font-medium text-zinc-700">{value}</dd>
    </div>
  );
}
