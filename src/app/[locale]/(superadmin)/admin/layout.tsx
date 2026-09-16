import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { UserMenu } from "@/components/shared/user-menu";
import { SuperAdminNav } from "./_components/superadmin-nav";

// Panel SuperAdmin (CLAUDE.md sección 1/10): subsistema aparte, fuera de
// cualquier salon_id — no reutiliza el Sidebar/Topbar del panel de gestión
// (esos están acoplados a "salón activo"). requirePlatformAdmin() es la
// única puerta: sin sesión -> /login, con sesión pero sin platform_admins ->
// /dashboard (Fase 9A).
export default async function SuperAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requirePlatformAdmin();
  const t = await getTranslations("superadmin.nav");
  const fullName = session.profile?.full_name ?? session.user.email ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-content-bg">
      <header className="flex items-center justify-between border-b border-card-border bg-card-bg px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 shrink-0 rounded-full bg-primary" aria-hidden />
            <span className="font-semibold text-text-primary">Oscar&apos;s Solution</span>
          </div>
          <SuperAdminNav
            items={[
              { href: "/admin/salons", label: t("salons") },
              { href: "/admin/currencies", label: t("currencies") },
              { href: "/admin/usage", label: t("usage") },
            ]}
          />
        </div>
        <UserMenu fullName={fullName} roleLabel="SuperAdmin" />
      </header>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
