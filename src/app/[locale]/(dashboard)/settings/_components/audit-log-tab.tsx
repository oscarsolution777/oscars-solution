"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatSalonDate } from "@/lib/utils/dates";
import type { listSalonMembers } from "@/lib/db/memberships";
import type { listAuditLog } from "@/lib/db/audit-log";

type Member = Awaited<ReturnType<typeof listSalonMembers>>[number];
type Entry = Awaited<ReturnType<typeof listAuditLog>>[number];

const ENTITY_KEYS = ["salon", "membership", "request", "appointment"] as const;
const ACTION_KEYS = [
  "salon_profile_updated",
  "membership_updated",
  "request_confirmed",
  "request_rejected",
  "appointment_cancelled",
] as const;

// Alcance acotado (decisión de esta fase, no todas las Server Actions del
// panel): cambios de configuración del salón, cambios de rol/estado de
// usuarios, y confirmar/rechazar solicitudes o cancelar citas.
export function AuditLogTab({
  entries,
  members,
  timezone,
  locale,
}: {
  entries: Entry[];
  members: Member[];
  timezone: string;
  locale: string;
}) {
  const t = useTranslations("settings.audit");
  const tEntities = useTranslations("settings.audit.entities");
  const tActions = useTranslations("settings.audit.actions");

  const nameByUserId = new Map(members.map((m) => [m.user_id, m.full_name]));

  if (entries.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-card-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnDate")}</TableHead>
            <TableHead>{t("columnUser")}</TableHead>
            <TableHead>{t("columnEntity")}</TableHead>
            <TableHead>{t("columnAction")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-text-secondary">
                {formatSalonDate(entry.created_at, timezone, locale, "PPPp")}
              </TableCell>
              <TableCell className="text-text-primary">
                {(entry.user_id && nameByUserId.get(entry.user_id)) || t("unknownUser")}
              </TableCell>
              <TableCell>
                {ENTITY_KEYS.includes(entry.entity as (typeof ENTITY_KEYS)[number])
                  ? tEntities(entry.entity as (typeof ENTITY_KEYS)[number])
                  : entry.entity}
              </TableCell>
              <TableCell>
                {ACTION_KEYS.includes(entry.action as (typeof ACTION_KEYS)[number])
                  ? tActions(entry.action as (typeof ACTION_KEYS)[number])
                  : entry.action}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
