// Construye BusinessMetrics reutilizando literalmente las funciones de
// src/lib/reports/aggregations.ts (mismas que usan dashboard/page.tsx y
// reports/page.tsx) — el módulo de IA nunca recalcula un KPI por su cuenta
// (CLAUDE.md sección 9).
import type { Tables } from "@/types/database";
import {
  sumPaidIncomeCents,
  computeNoShowRate,
  computeTopServices,
  computeStaffWorkload,
  computeClientSegments,
  computeCashDifferenceTotal,
} from "@/lib/reports/aggregations";
import type { BusinessMetrics } from "./types";

type PaymentRow = Tables<"payments">;
type AppointmentRow = Tables<"appointments">;
type AppointmentItemRow = Tables<"appointment_items">;
type ClientRow = Tables<"clients">;
type ServiceRow = Tables<"services">;
type StaffRow = Tables<"staff">;
type CashClosureRow = Tables<"cash_closures">;
type RequestRow = Tables<"requests">;
type ProductRow = Tables<"products">;

// Últimos 30 días fijos, sin selector (decisión de la Fase 9B: es un
// snapshot de "cómo va el negocio ahora", no un reporte histórico
// navegable). Aritmética pura en UTC, igual que src/lib/utils/period.ts,
// para no depender del reloj local del proceso.
export function getLast30DaysRange(todayInSalonTz: string): { from: string; to: string } {
  const d = new Date(`${todayInSalonTz}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 29);
  return { from: d.toISOString().slice(0, 10), to: todayInSalonTz };
}

export function buildBusinessMetrics(input: {
  currency: string;
  from: string;
  to: string;
  payments: PaymentRow[];
  appointments: AppointmentRow[];
  appointmentItems: AppointmentItemRow[];
  services: ServiceRow[];
  staff: StaffRow[];
  clients: ClientRow[];
  cashClosures: CashClosureRow[];
  requests: RequestRow[];
  products: ProductRow[];
}): BusinessMetrics {
  const {
    currency,
    from,
    to,
    payments,
    appointments,
    appointmentItems,
    services,
    staff,
    clients,
    cashClosures,
    requests,
    products,
  } = input;

  const appointmentsById = new Map(appointments.map((a) => [a.id, a]));
  const servicesById = new Map(services.map((s) => [s.id, s]));
  const staffById = new Map(staff.map((s) => [s.id, s]));

  const incomeCents = sumPaidIncomeCents(payments, from, to);
  const { completed, rate: noShowRate } = computeNoShowRate(appointments, from, to);
  const avgTicketCents = completed > 0 ? Math.round(incomeCents / completed) : 0;

  const topServices = computeTopServices(appointmentItems, appointmentsById, servicesById, from, to)
    .slice(0, 5)
    .map((row) => ({ name: row.name, units: row.units, revenueCents: row.revenueCents }));

  const staffWorkload = computeStaffWorkload(appointmentItems, appointmentsById, staffById, from, to).map(
    (row) => ({ name: row.name, assignedCount: row.assignedCount, revenueCents: row.revenueCents })
  );

  const { newCount, recurringCount } = computeClientSegments(clients, appointments, from, to);
  const cashDifferenceCents = computeCashDifferenceTotal(cashClosures, from, to);

  const pendingRequestsCount = requests.filter((r) => r.status === "pending").length;
  const lowStockProducts = products
    .filter((p) => p.is_active && p.stock_qty <= p.min_stock)
    .map((p) => ({ name: p.name, stockQty: p.stock_qty, minStock: p.min_stock }));

  return {
    periodFrom: from,
    periodTo: to,
    currency,
    incomeCents,
    completedAppointmentsCount: completed,
    noShowRate,
    avgTicketCents,
    topServices,
    staffWorkload,
    newClientsCount: newCount,
    recurringClientsCount: recurringCount,
    pendingRequestsCount,
    lowStockProducts,
    cashDifferenceCents,
  };
}
