/**
 * Donos do aplicativo: essas contas sempre têm papel de Administrador,
 * independentemente do que estiver salvo no banco — não podem ser rebaixadas
 * e recebem ADMIN automaticamente ao criar a conta.
 */
export const OWNER_EMAILS = [
  "martinsphilippes@gmail.com",
  "admin@liga.com",
];

export function isOwnerEmail(email: string | null | undefined): boolean {
  return !!email && OWNER_EMAILS.includes(email.toLowerCase());
}
