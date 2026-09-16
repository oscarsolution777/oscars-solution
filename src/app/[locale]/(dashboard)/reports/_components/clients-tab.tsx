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
import type { ClientSegments } from "@/lib/reports/aggregations";
import { ClientsChart } from "./clients-chart";
import { ExportCsvButton } from "./export-csv-button";

type ClientRow = Tables<"clients">;

export function ClientsTab({
  segments,
  clients,
  currency,
  timezone,
  locale,
}: {
  segments: ClientSegments;
  clients: ClientRow[];
  currency: string;
  timezone: string;
  locale: string;
}) {
  const t = useTranslations("reports.clients");

  const sorted = [...clients].sort((a, b) => b.total_spent_cents - a.total_spent_cents);

  const csvRows = sorted.map((c) => ({
    nombre: c.full_name,
    telefono: c.phone,
    gasto_total: (c.total_spent_cents / 100).toFixed(2),
    ultima_visita: c.last_visit_at ? formatSalonDate(c.last_visit_at, timezone, locale, "yyyy-MM-dd") : "",
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <ClientsChart segments={segments} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ExportCsvButton rows={csvRows} filename="clientes.csv" />
      </div>

      {sorted.length === 0 ? (
        <EmptyState title={t("emptyTable")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnName")}</TableHead>
                <TableHead>{t("columnPhone")}</TableHead>
                <TableHead>{t("columnTotalSpent")}</TableHead>
                <TableHead>{t("columnLastVisit")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium text-text-primary">{client.full_name}</TableCell>
                  <TableCell className="text-text-secondary">{client.phone}</TableCell>
                  <TableCell className="text-text-primary">
                    {formatMoney(client.total_spent_cents, currency, locale)}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {client.last_visit_at
                      ? formatSalonDate(client.last_visit_at, timezone, locale, "PP")
                      : "—"}
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
