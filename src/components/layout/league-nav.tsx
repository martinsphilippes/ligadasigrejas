"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Ativo apenas quando o caminho é exatamente igual (para o dashboard). */
  exact?: boolean;
}

export function LeagueNav({ slug, canManage }: { slug: string; canManage: boolean }) {
  const pathname = usePathname();
  const base = `/ligas/${slug}`;

  const items: NavItem[] = [
    { href: base, label: "Dashboard", icon: "▦", exact: true },
    { href: `${base}/classificacao`, label: "Classificação", icon: "🏆" },
    { href: `${base}/rodadas`, label: "Rodadas", icon: "🗓" },
    { href: `${base}/jogos`, label: "Jogos", icon: "⚽" },
    { href: `${base}/minha-equipe`, label: "Minha Equipe", icon: "⭐" },
    { href: `${base}/equipes`, label: "Equipes", icon: "🛡" },
    { href: `${base}/atletas`, label: "Atletas", icon: "👟" },
    { href: `${base}/quadras`, label: "Quadras", icon: "🏟" },
    { href: `${base}/agenda`, label: "Agenda", icon: "📅" },
    { href: `${base}/regras`, label: "Regras", icon: "📋" },
    { href: `${base}/sobre`, label: "Sobre", icon: "ℹ️" },
    ...(canManage
      ? [{ href: `${base}/organizacao`, label: "Organização", icon: "👥" }]
      : []),
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:pb-0">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-800 text-white shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
            )}
          >
            <span className="text-xs opacity-80">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
