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
import { formatMoney } from "@/lib/utils/money";
import type { Database } from "@/types/database";

type UsageRow =
  Database["public"]["Functions"]["platform_usage_summary"]["Returns"][number];

export function UsageTable({ usage, locale }: { usage: UsageRow[]; locale: string }) {
  const t = useTranslations("superadmin.usage.table");

  if (usage.length === 0) {
    return <EmptyState title={t("emptyTitle")} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-card-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnSalon")}</TableHead>
            <TableHead>{t("columnAppointments")}</TableHead>
            <TableHead>{t("columnRevenue")}</TableHead>
            <TableHead>{t("columnClients")}</TableHead>
            <TableHead>{t("columnLastActivity")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usage.map((row) => (
            <TableRow key={row.salon_id}>
              <TableCell className="font-medium text-text-primary">
                {row.salon_name}
              </TableCell>
              <TableCell>{row.appointments_count}</TableCell>
              <TableCell>
                {formatMoney(row.paid_revenue_cents, row.currency, locale)}
              </TableCell>
              <TableCell>{row.clients_count}</TableCell>
              <TableCell className="text-text-secondary">
                {row.last_activity_at
                  ? new Date(row.last_activity_at).toLocaleDateString(locale)
                  : t("never")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
