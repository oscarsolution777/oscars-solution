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
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { formatMoney } from "@/lib/utils/money";
import { usePagination } from "@/lib/utils/pagination";
import type { StaffWorkloadRow } from "@/lib/reports/aggregations";
import { StaffChart } from "./staff-chart";
import { ExportButtons } from "./export-buttons";

export function StaffTab({
  rows,
  currency,
  locale,
}: {
  rows: StaffWorkloadRow[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("reports.staff");
  const { page, setPage, totalPages, pageItems } = usePagination(rows);

  let topByLoad: StaffWorkloadRow | null = null;
  let topByRevenue: StaffWorkloadRow | null = null;
  for (const row of rows) {
    if (!topByLoad || row.assignedCount > topByLoad.assignedCount) topByLoad = row;
    if (!topByRevenue || row.revenueCents > topByRevenue.revenueCents) topByRevenue = row;
  }

  const csvRows = rows.map((r) => ({
    [t("columnStaff")]: r.name,
    [t("columnAssigned")]: r.assignedCount,
    [t("columnRevenue")]: (r.revenueCents / 100).toFixed(2),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">{t("topLoadLabel")}</p>
            <p className="truncate text-xl font-bold text-text-primary">
              {topByLoad ? topByLoad.name : "—"}
            </p>
            <p className="text-xs text-text-secondary">
              {topByLoad ? t("assignedCaption", { count: topByLoad.assignedCount }) : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">{t("topRevenueLabel")}</p>
            <p className="truncate text-xl font-bold text-text-primary">
              {topByRevenue ? topByRevenue.name : "—"}
            </p>
            <p className="text-xs text-text-secondary">
              {topByRevenue ? formatMoney(topByRevenue.revenueCents, currency, locale) : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState title={t("emptyChart")} />
          ) : (
            <StaffChart rows={rows} />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ExportButtons rows={csvRows} baseFilename="trabajadores" tabKey="staff" />
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t("emptyTable")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnStaff")}</TableHead>
                <TableHead>{t("columnAssigned")}</TableHead>
                <TableHead>{t("columnRevenue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((row) => (
                <TableRow key={row.staffId}>
                  <TableCell className="font-medium text-text-primary">{row.name}</TableCell>
                  <TableCell className="text-text-secondary">{row.assignedCount}</TableCell>
                  <TableCell className="text-text-primary">
                    {formatMoney(row.revenueCents, currency, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
