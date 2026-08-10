/* eslint-disable @next/next/no-img-element */
import { cn, initials } from "@/lib/utils";

const sizes = {
  xs: "size-6 text-[9px]",
  sm: "size-8 text-[10px]",
  md: "size-10 text-xs",
  lg: "size-14 text-sm",
  xl: "size-20 text-lg",
} as const;

/** Avatar com foto ou iniciais (pessoas: círculo; escudos: cantos suaves). */
export function Avatar({
  name,
  src,
  size = "md",
  shape = "circle",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  shape?: "circle" | "shield";
  className?: string;
}) {
  const radius = shape === "circle" ? "rounded-full" : "rounded-lg";
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("shrink-0 object-cover", sizes[size], radius, className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-brand-100 font-bold text-brand-800",
        sizes[size],
        radius,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
