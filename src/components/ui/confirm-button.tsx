"use client";

import { Button } from "./button";

/** Botão que pede confirmação antes de submeter o formulário (ações destrutivas). */
export function ConfirmButton({
  message = "Tem certeza? Esta ação não pode ser desfeita.",
  children,
  ...props
}: React.ComponentProps<typeof Button> & { message?: string }) {
  return (
    <Button
      type="submit"
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
