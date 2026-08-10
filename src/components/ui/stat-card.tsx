import { Card } from "./card";

/** Cartão de indicador usado no dashboard. */
export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="px-5 py-4 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-zinc-900">
            {value}
          </p>
          {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
        </div>
        {icon && (
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-lg">
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}
