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
import { formatSalonDate } from "@/lib/utils/dates";
import type { Tables } from "@/types/database";
import type { SalesBucket } from "@/lib/reports/aggregations";
import { SalesChart } from "./sales-chart";
import { ExportButtons } from "./export-buttons";

type PaymentRow = Tables<"payments">;
type ClientRow = Tables<"clients">;

export function SalesTab({
  buckets,
  payments,
  clientsById,
  currency,
  timezone,
  locale,
}: {
  buckets: SalesBucket[];
  payments: PaymentRow[];
  clientsById: Map<string, ClientRow>;
  currency: string;
  timezone: string;
  locale: string;
}) {
  const t = useTranslations("reports.sales");
  const tMethods = useTranslations("payments.methods");
  const tStatuses = useTranslations("payments.statuses");

  const incomeCents = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const refundedCents = payments
    .filter((p) => p.status === "refunded")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const csvRows = payments.map((p) => ({
    [t("columnDate")]: formatSalonDate(p.paid_at, timezone, locale, "yyyy-MM-dd"),
    [t("columnClient")]: clientsById.get(p.client_id)?.full_name ?? "",
    [t("columnAmount")]: (p.amount_cents / 100).toFixed(2),
    [t("columnMethod")]: tMethods(p.method),
    [t("columnStatus")]: tStatuses(p.status),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">{t("totalIncome")}</p>
            <p className="text-xl font-bold text-text-primary">
              {formatMoney(incomeCents, currency, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">{t("totalRefunded")}</p>
            <p className="text-xl font-bold text-text-primary">
              {formatMoney(refundedCents, currency, locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          {buckets.length === 0 ? (
            <EmptyState title={t("emptyChart")} />
          ) : (
            <SalesChart buckets={buckets} currency={currency} locale={locale} />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ExportButtons rows={csvRows} baseFilename="ventas" tabKey="sales" />
      </div>

      {payments.length === 0 ? (
        <EmptyState title={t("emptyTable")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnDate")}</TableHead>
                <TableHead>{t("columnClient")}</TableHead>
                <TableHead>{t("columnAmount")}</TableHead>
                <TableHead>{t("columnMethod")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-text-secondary">
                    {formatSalonDate(payment.paid_at, timezone, locale, "PP")}
                  </TableCell>
                  <TableCell className="font-medium text-text-primary">
                    {clientsById.get(payment.client_id)?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-text-primary">
                    {formatMoney(payment.amount_cents, currency, locale)}
                  </TableCell>
                  <TableCell className="text-text-secondary">{tMethods(payment.method)}</TableCell>
                  <TableCell className="text-text-secondary">{tStatuses(payment.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
