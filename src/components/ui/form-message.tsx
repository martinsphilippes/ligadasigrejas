export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 animate-fade-in">
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800 animate-fade-in">
      {message}
    </p>
  );
}
