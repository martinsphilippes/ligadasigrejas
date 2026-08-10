"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";

/** Botão de envio com estado de carregamento automático (useFormStatus). */
export function SubmitButton({
  children,
  pendingText = "Salvando...",
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (
        <>
          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
