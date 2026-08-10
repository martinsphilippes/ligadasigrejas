import { cn } from "@/lib/utils";

/** Bloco de carregamento pulsante. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-zinc-200/70", className)} />;
}

/** Tela de carregamento padrão: cabeçalho + cartões. */
export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando...">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24 hidden lg:block" />
        <Skeleton className="h-24 hidden lg:block" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
