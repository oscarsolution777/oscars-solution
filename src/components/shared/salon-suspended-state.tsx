// Capa de producto (no de seguridad: RLS no depende de subscription_status)
// que bloquea el panel de gestión cuando el salón activo está suspendido o
// cancelado (Fase 9A). El texto ya viene traducido del caller, igual que
// EmptyState/ErrorState (Server Component -> getTranslations).
export function SalonSuspendedState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-lg font-semibold text-text-primary">{title}</p>
      <p className="max-w-sm text-sm text-text-secondary">{body}</p>
    </div>
  );
}
