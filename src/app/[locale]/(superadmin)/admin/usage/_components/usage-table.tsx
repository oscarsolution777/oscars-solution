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
import { Pagination } from "@/components/shared/pagination";
import { usePagination } from "@/lib/utils/pagination";
import { formatMoney } from "@/lib/utils/money";
import type { Database } from "@/types/database";

type UsageRow =
  Database["public"]["Functions"]["platform_usage_summary"]["Returns"][number];

export function UsageTable({ usage, locale }: { usage: UsageRow[]; locale: string }) {
  const t = useTranslations("superadmin.usage.table");
  // Paginación (bloque de ajustes posterior a Fase 10, punto 10): mismo
  // patrón/tamaño de página (20) que el resto del sistema -- esta tabla podía
  // crecer sin límite con el número de salones.
  const { page, setPage, totalPages, pageItems } = usePagination(usage);

  if (usage.length === 0) {
    return <EmptyState title={t("emptyTitle")} />;
  }

  return (
    <div className="space-y-4">
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
            {pageItems.map((row) => (
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

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
