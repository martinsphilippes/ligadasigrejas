import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { Avatar } from "@/components/ui/avatar";
import type { SessionPayload } from "@/lib/auth/session";

export function Topbar({ user }: { user: SessionPayload }) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-brand-900">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gold-500 text-sm">
              🏆
            </span>
            <span className="hidden sm:inline">Liga das Igrejas</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              Minhas Ligas
            </Link>
            <Link
              href="/igrejas"
              className="rounded-lg px-3 py-1.5 font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              Igrejas
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-500 md:inline">{user.name}</span>
          <Avatar name={user.name} size="sm" />
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
