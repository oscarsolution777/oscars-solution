import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/guards";
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

  const salonName = session.activeMembership?.salon?.name ?? "—";
  const fullName = session.profile?.full_name ?? session.user.email ?? "";
  const roleLabel = session.activeMembership?.role ?? "";
  const subscriptionStatus = session.activeMembership?.salon?.subscription_status;
  const isSuspended = subscriptionStatus === "suspended" || subscriptionStatus === "cancelled";

  return (
    <div className="flex min-h-screen bg-content-bg">
      <Sidebar salonName={salonName} role={roleLabel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={t("welcomeTitle")}
          subtitle={t("welcomeBody")}
          userFullName={fullName}
          userRoleLabel={roleLabel}
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
