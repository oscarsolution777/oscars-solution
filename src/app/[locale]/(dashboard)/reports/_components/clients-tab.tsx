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
import { formatSalonDate } from "@/lib/utils/dates";
import { usePagination } from "@/lib/utils/pagination";
import type { Tables } from "@/types/database";
import type { ClientSegments } from "@/lib/reports/aggregations";
import { ClientsChart } from "./clients-chart";
import { ExportButtons } from "./export-buttons";

type ClientRow = Tables<"clients">;
type AppointmentRow = Tables<"appointments">;

export function ClientsTab({
  segments,
  clients,
  appointments,
  currency,
  timezone,
  locale,
}: {
  segments: ClientSegments;
  clients: ClientRow[];
  appointments: AppointmentRow[];
  currency: string;
  timezone: string;
  locale: string;
}) {
  const t = useTranslations("reports.clients");

  const sorted = [...clients].sort((a, b) => b.total_spent_cents - a.total_spent_cents);
  const { page, setPage, totalPages, pageItems } = usePagination(sorted);

  // "Cliente con más gasto" / "cliente más frecuente": a diferencia del resto
  // de Reportes (filtrado por el periodo del selector), estos dos KPIs usan
  // el mismo dato de por-vida que ya muestra la columna "Gasto total" de esta
  // misma tabla (clients.total_spent_cents) -- mezclar un ranking "de todo el
  // tiempo" arriba con uno "del periodo" abajo, en la misma pestaña, sería
  // más confuso que útil. Frecuencia = nº de citas completadas históricas.
  const topSpender = sorted.length > 0 && sorted[0].total_spent_cents > 0 ? sorted[0] : null;

  const visitCountByClient = new Map<string, number>();
  for (const appointment of appointments) {
    if (appointment.status !== "completed") continue;
    visitCountByClient.set(
      appointment.client_id,
      (visitCountByClient.get(appointment.client_id) ?? 0) + 1
    );
  }
  let mostFrequent: { client: ClientRow; count: number } | null = null;
  for (const client of clients) {
    const count = visitCountByClient.get(client.id) ?? 0;
    if (count > 0 && (!mostFrequent || count > mostFrequent.count)) {
      mostFrequent = { client, count };
    }
  }

  const csvRows = sorted.map((c) => ({
    [t("columnName")]: c.full_name,
    [t("columnPhone")]: c.phone ?? "—",
    [t("columnTotalSpent")]: (c.total_spent_cents / 100).toFixed(2),
    [t("columnLastVisit")]: c.last_visit_at
      ? formatSalonDate(c.last_visit_at, timezone, locale, "yyyy-MM-dd")
      : "—",
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">{t("topSpenderLabel")}</p>
            <p className="truncate text-xl font-bold text-text-primary">
              {topSpender ? topSpender.full_name : "—"}
            </p>
            <p className="text-xs text-text-secondary">
              {topSpender ? formatMoney(topSpender.total_spent_cents, currency, locale) : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">{t("mostFrequentLabel")}</p>
            <p className="truncate text-xl font-bold text-text-primary">
              {mostFrequent ? mostFrequent.client.full_name : "—"}
            </p>
            <p className="text-xs text-text-secondary">
              {mostFrequent ? t("visitsCaption", { count: mostFrequent.count }) : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <ClientsChart segments={segments} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ExportButtons rows={csvRows} baseFilename="clientes" tabKey="clients" />
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
              {pageItems.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium text-text-primary">{client.full_name}</TableCell>
                  <TableCell className="text-text-secondary">{client.phone || "—"}</TableCell>
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

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
