"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalonProfileForm } from "./salon-profile-form";
import { QrCard } from "./qr-card";
import { MembersTab } from "./members-tab";
import { AuditLogTab } from "./audit-log-tab";
import type { listSalonMembers } from "@/lib/db/memberships";
import type { listAuditLog } from "@/lib/db/audit-log";

type Salon = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  default_locale: string;
};

// Usuarios y Auditoría son owner-only (CLAUDE.md sección 7: admin tiene
// "parcial" en Configuración — solo lectura de datos del salón + QR). Datos
// del salón se muestra siempre, editable únicamente para el owner.
export function SettingsTabs({
  role,
  salon,
  qrPortal,
  members,
  auditLog,
  currentUserId,
}: {
  role: string;
  salon: Salon;
  qrPortal: { url: string; dataUrl: string };
  members: Awaited<ReturnType<typeof listSalonMembers>>;
  auditLog: Awaited<ReturnType<typeof listAuditLog>>;
  currentUserId: string;
}) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const isOwner = role === "owner";
  const [tab, setTab] = useState<"profile" | "members" | "audit">("profile");

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList>
          <TabsTrigger value="profile">{t("tabs.profile")}</TabsTrigger>
          {isOwner && <TabsTrigger value="members">{t("tabs.members")}</TabsTrigger>}
          {isOwner && <TabsTrigger value="audit">{t("tabs.audit")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <SalonProfileForm salon={salon} isOwner={isOwner} />
          <QrCard qrDataUrl={qrPortal.dataUrl} portalUrl={qrPortal.url} />
        </TabsContent>

        {isOwner && (
          <TabsContent value="members">
            <MembersTab members={members} currentUserId={currentUserId} />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="audit">
            <AuditLogTab entries={auditLog} members={members} timezone={salon.timezone} locale={locale} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
