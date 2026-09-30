import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { countPendingRequests } from "@/lib/db/requests";
import { Sidebar } from "@/components/shared/sidebar";
import { Topbar } from "@/components/shared/topbar";
import { SalonSuspendedState } from "@/components/shared/salon-suspended-state";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAuth();
  const t = await getTranslations("dashboard");
  const tRoles = await getTranslations("settings.members.roles");

  const salonName = session.activeMembership?.salon?.name ?? "—";
  const fullName = session.profile?.full_name ?? session.user.email ?? "";
  // Rol crudo (owner/admin/reception): controla qué ve el Sidebar
  // (restrictedToRoles) — nunca se muestra tal cual al usuario.
  const activeRole = session.activeMembership?.role ?? "";
  // Label mostrado en Topbar/UserMenu: traducido, y distinto para quien tiene
  // acceso de plataforma (migración 0022) — su membership queda guardada
  // como "owner" por mecanismo interno, pero mostrarle literalmente "Dueña"
  // sería confuso: no es la dueña del salón, es soporte de Oscar's Solution.
  const roleLabel = session.isPlatformAdmin
    ? tRoles("platformAdmin")
    : tRoles(activeRole || "reception");
  const subscriptionStatus = session.activeMembership?.salon?.subscription_status;
  const isSuspended = subscriptionStatus === "suspended" || subscriptionStatus === "cancelled";
  const salons = session.memberships
    .filter((m) => m.salon)
    .map((m) => ({ id: m.salon!.id, name: m.salon!.name }));

  // Badge del sidebar en "Solicitudes y Citas": se pide junto al resto del
  // layout (se refresca al navegar, no en tiempo real). Si el salón está
  // suspendido no hace falta la consulta: el layout va a bloquear el acceso
  // igual más abajo.
  let pendingRequestsCount = 0;
  if (session.activeMembership?.salon && !isSuspended) {
    const supabase = await createClient();
    pendingRequestsCount = await countPendingRequests(supabase, session.activeMembership.salon.id);
  }

  return (
    <div className="flex min-h-screen bg-content-bg">
      <Sidebar
        salonName={salonName}
        logoUrl={session.activeMembership?.salon?.logo_url ?? null}
        role={activeRole}
        salons={salons}
        activeSalonId={session.activeMembership?.salon?.id}
        pendingRequestsCount={pendingRequestsCount}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={t("welcomeTitle")}
          subtitle={t("welcomeBody")}
          userFullName={fullName}
          userRoleLabel={roleLabel}
          userEmail={session.user.email ?? ""}
          salonTimezone={session.activeMembership?.salon?.timezone ?? "America/Guyana"}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {isSuspended ? (
            <SalonSuspendedState
              title={t("suspended.title")}
              body={
                session.activeMembership?.salon?.is_demo
                  ? t("suspended.demoExpiredBody")
                  : t("suspended.body")
              }
            />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
