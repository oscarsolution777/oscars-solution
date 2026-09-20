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

  const csvRows = rows.map((r) => ({
    [t("columnService")]: r.name,
    [t("columnUnits")]: r.units,
    [t("columnRevenue")]: (r.revenueCents / 100).toFixed(2),
  }));

  return (
    <div className="space-y-4">
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
              {rows.map((row) => (
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
    </div>
  );
}
