import type { ReactNode } from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { PanelLocaleSwitcher } from "@/components/shared/panel-locale-switcher";
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
          <Image
            src="/brand/oscars-solution-logo.png"
            alt="Oscar's Solution"
            width={480}
            height={310}
            priority
            className="h-9 w-auto shrink-0"
          />
          <SuperAdminNav
            items={[
              { href: "/admin/salons", label: t("salons") },
              { href: "/admin/currencies", label: t("currencies") },
              { href: "/admin/usage", label: t("usage") },
            ]}
          />
        </div>
        <div className="flex items-center gap-1">
          <PanelLocaleSwitcher />
          <UserMenu fullName={fullName} roleLabel="SuperAdmin" />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
