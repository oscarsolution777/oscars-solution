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
import { formatMoney } from "@/lib/utils/money";
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

  const csvRows = rows.map((r) => ({
    [t("columnStaff")]: r.name,
    [t("columnAssigned")]: r.assignedCount,
    [t("columnRevenue")]: (r.revenueCents / 100).toFixed(2),
  }));

  return (
    <div className="space-y-4">
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
              {rows.map((row) => (
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
    </div>
  );
}
