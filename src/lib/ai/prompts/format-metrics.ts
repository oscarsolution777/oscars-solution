// Bloque de métricas compartido por los dos prompts (analyze-business y
// recommendations) para no duplicar el mismo texto dos veces.
import type { BusinessMetrics } from "../types";

export const LOCALE_NAMES: Record<string, string> = {
  es: "español",
  en: "inglés",
  pt: "portugués",
  it: "italiano",
  fr: "francés",
  de: "alemán",
};

export function formatMetricsBlock(metrics: BusinessMetrics): string {
  const money = (cents: number) => `${(cents / 100).toFixed(2)} ${metrics.currency}`;

  const topServices =
    metrics.topServices.map((s) => `${s.name} (${s.units} unidades, ${money(s.revenueCents)})`).join("; ") ||
    "sin datos";
  const staffWorkload =
    metrics.staffWorkload.map((s) => `${s.name} (${s.assignedCount} servicios asignados)`).join("; ") ||
    "sin datos";
  const lowStock =
    metrics.lowStockProducts.map((p) => `${p.name} (${p.stockQty}/${p.minStock})`).join("; ") || "ninguno";

  return `Periodo: del ${metrics.periodFrom} al ${metrics.periodTo} (moneda: ${metrics.currency}).
- Ingresos cobrados: ${money(metrics.incomeCents)}
- Citas completadas: ${metrics.completedAppointmentsCount}
- Tasa de no-show: ${(metrics.noShowRate * 100).toFixed(1)}%
- Ticket promedio: ${money(metrics.avgTicketCents)}
- Servicios más vendidos: ${topServices}
- Carga de trabajo por trabajador: ${staffWorkload}
- Clientes nuevos: ${metrics.newClientsCount}
- Clientes recurrentes: ${metrics.recurringClientsCount}
- Solicitudes pendientes sin responder: ${metrics.pendingRequestsCount}
- Productos bajo el stock mínimo: ${lowStock}
- Diferencia de caja acumulada: ${money(metrics.cashDifferenceCents)}`;
}
