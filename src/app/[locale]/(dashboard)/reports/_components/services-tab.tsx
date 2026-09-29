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
import type { ServiceSalesRow } from "@/lib/reports/aggregations";
import { ServicesChart } from "./services-chart";
import { ExportButtons } from "./export-buttons";

export function ServicesTab({
  rows,
  currency,
  locale,
}: {
  rows: ServiceSalesRow[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("reports.services");
  const { page, setPage, totalPages, pageItems } = usePagination(rows);

  let topByUnits: ServiceSalesRow | null = null;
  let topByRevenue: ServiceSalesRow | null = null;
  for (const row of rows) {
    if (!topByUnits || row.units > topByUnits.units) topByUnits = row;
    if (!topByRevenue || row.revenueCents > topByRevenue.revenueCents) topByRevenue = row;
  }

  const csvRows = rows.map((r) => ({
    [t("columnService")]: r.name,
    [t("columnUnits")]: r.units,
    [t("columnRevenue")]: (r.revenueCents / 100).toFixed(2),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">{t("topSellingLabel")}</p>
            <p className="truncate text-xl font-bold text-text-primary">
              {topByUnits ? topByUnits.name : "—"}
            </p>
            <p className="text-xs text-text-secondary">
              {topByUnits ? t("unitsCaption", { count: topByUnits.units }) : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">{t("topProfitableLabel")}</p>
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
            <ServicesChart rows={rows} currency={currency} locale={locale} />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ExportButtons rows={csvRows} baseFilename="servicios" tabKey="services" />
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t("emptyTable")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnService")}</TableHead>
                <TableHead>{t("columnUnits")}</TableHead>
                <TableHead>{t("columnRevenue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((row) => (
                <TableRow key={row.serviceId}>
                  <TableCell className="font-medium text-text-primary">{row.name}</TableCell>
                  <TableCell className="text-text-secondary">{row.units}</TableCell>
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
