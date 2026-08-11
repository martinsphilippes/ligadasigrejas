"use client";

import { useTransition } from "react";
import { setInternalRatingAction } from "@/lib/actions/internal";
import { cn } from "@/lib/utils";

/** Nota 1–5 do atleta no jogo; tocar na estrela atual limpa a nota. */
export function RatingStars({
  matchId,
  athleteId,
  rating,
}: {
  matchId: string;
  athleteId: string;
  rating: number | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <span className={cn("flex items-center", pending && "opacity-50")}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={pending}
          aria-label={`Nota ${n}`}
          onClick={() =>
            startTransition(() =>
              setInternalRatingAction(matchId, athleteId, n === rating ? 0 : n),
            )
          }
          className={cn(
            "px-0.5 text-sm transition-transform active:scale-125",
            n <= (rating ?? 0) ? "text-amber-400" : "text-zinc-300 hover:text-amber-300",
          )}
        >
          ★
        </button>
      ))}
    </span>
  );
}
