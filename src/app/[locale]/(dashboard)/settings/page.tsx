import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { buildPortalUrl, generatePortalQrDataUrl } from "@/lib/qr/generate-portal-qr";
import { listSalonMembers } from "@/lib/db/memberships";
import { listAuditLog } from "@/lib/db/audit-log";
import { SettingsTabs } from "./_components/settings-tabs";

export default async function SettingsPage() {
  const session = await requireAuth();
  const salon = session.activeMembership?.salon;

  if (!salon || !session.activeMembership) {
    const t = await getTranslations("dashboard");
    const tAuth = await getTranslations("auth.login");
    return <EmptyState title={t("welcomeTitle")} description={tAuth("noMembership")} />;
  }

  const role = session.activeMembership.role;

  // CLAUDE.md sección 7: "Configuración" es owner ✅ / admin parcial (solo
  // lectura de datos del salón + QR, sin usuarios ni auditoría) / reception
  // ❌ — bloqueada por completo, ni siquiera de lectura (mismo patrón que
  // "Finanzas" en finances/page.tsx).
  if (role === "reception") {
    const t = await getTranslations("settings");
    return <EmptyState title={t("errors.forbiddenTitle")} description={t("errors.forbidden")} />;
  }

  const portalUrl = buildPortalUrl(salon.slug, salon.default_locale);
  const qrDataUrl = await generatePortalQrDataUrl(portalUrl);

  let members: Awaited<ReturnType<typeof listSalonMembers>> = [];
  let auditLog: Awaited<ReturnType<typeof listAuditLog>> = [];

  if (role === "owner") {
    const supabase = await createClient();
    [members, auditLog] = await Promise.all([
      listSalonMembers(supabase, salon.id),
      listAuditLog(supabase, salon.id),
    ]);
  }

  return (
    <SettingsTabs
      role={role}
      salon={salon}
      qrPortal={{ url: portalUrl, dataUrl: qrDataUrl }}
      members={members}
      auditLog={auditLog}
      currentUserId={session.user.id}
    />
  );
}
