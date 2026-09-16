// Funciones puras de agregación para Dashboard y Reportes (Fase 8). Sin acceso
// a Supabase: reciben arrays ya cargados por los Server Components (mismo
// patrón de "fetch completo + Map por id + reduce en memoria" ya usado en
// finances/page.tsx y services/page.tsx) y devuelven estructuras simples.
// Se comparten literalmente entre dashboard/page.tsx y reports/page.tsx para
// no duplicar la definición de cada KPI (CLAUDE.md sección 9).
import { formatInTimeZone } from "date-fns-tz";
import type { Tables } from "@/types/database";

type PaymentRow = Tables<"payments">;
type AppointmentRow = Tables<"appointments">;
type AppointmentItemRow = Tables<"appointment_items">;
type ClientRow = Tables<"clients">;
type ServiceRow = Tables<"services">;
type StaffRow = Tables<"staff">;
type CashClosureRow = Tables<"cash_closures">;

export function inRange(dateStr: string, from: string, to: string): boolean {
  const d = dateStr.slice(0, 10);
  return d >= from && d <= to;
}

export function sumPaidIncomeCents(payments: PaymentRow[], from: string, to: string): number {
  return payments
    .filter((p) => p.status === "paid" && inRange(p.paid_at, from, to))
    .reduce((sum, p) => sum + p.amount_cents, 0);
}

export function computeNoShowRate(
  appointments: AppointmentRow[],
  from: string,
  to: string
): { completed: number; noShow: number; rate: number } {
  const inPeriod = appointments.filter((a) => inRange(a.appointment_date, from, to));
  const completed = inPeriod.filter((a) => a.status === "completed").length;
  const noShow = inPeriod.filter((a) => a.status === "no_show").length;
  const rate = completed + noShow > 0 ? noShow / (completed + noShow) : 0;
  return { completed, noShow, rate };
}

export interface ServiceSalesRow {
  serviceId: string;
  name: string;
  units: number;
  revenueCents: number;
}

// "Servicios más vendidos": solo citas completadas cuentan como venta real.
export function computeTopServices(
  appointmentItems: AppointmentItemRow[],
  appointmentsById: Map<string, AppointmentRow>,
  servicesById: Map<string, ServiceRow>,
  from: string,
  to: string
): ServiceSalesRow[] {
  const byService = new Map<string, ServiceSalesRow>();

  for (const item of appointmentItems) {
    const appointment = appointmentsById.get(item.appointment_id);
    if (!appointment || appointment.status !== "completed") continue;
    if (!inRange(appointment.appointment_date, from, to)) continue;

    const service = servicesById.get(item.service_id);
    const name = service?.name ?? "—";
    const current = byService.get(item.service_id) ?? {
      serviceId: item.service_id,
      name,
      units: 0,
      revenueCents: 0,
    };
    current.units += 1;
    current.revenueCents += item.price_cents;
    byService.set(item.service_id, current);
  }

  return Array.from(byService.values()).sort((a, b) => b.revenueCents - a.revenueCents);
}

export interface StaffWorkloadRow {
  staffId: string;
  name: string;
  assignedCount: number;
  revenueCents: number;
}

// "Carga de trabajo por trabajador": cuenta lo asignado (excluye cancelado);
// los ingresos solo se atribuyen a lo efectivamente completado.
export function computeStaffWorkload(
  appointmentItems: AppointmentItemRow[],
  appointmentsById: Map<string, AppointmentRow>,
  staffById: Map<string, StaffRow>,
  from: string,
  to: string
): StaffWorkloadRow[] {
  const byStaff = new Map<string, StaffWorkloadRow>();

  for (const item of appointmentItems) {
    const appointment = appointmentsById.get(item.appointment_id);
    if (!appointment || appointment.status === "cancelled") continue;
    if (!inRange(appointment.appointment_date, from, to)) continue;

    const staff = staffById.get(item.staff_id);
    const name = staff?.full_name ?? "—";
    const current = byStaff.get(item.staff_id) ?? {
      staffId: item.staff_id,
      name,
      assignedCount: 0,
      revenueCents: 0,
    };
    current.assignedCount += 1;
    if (appointment.status === "completed") current.revenueCents += item.price_cents;
    byStaff.set(item.staff_id, current);
  }

  return Array.from(byStaff.values()).sort((a, b) => b.assignedCount - a.assignedCount);
}

export interface ClientSegments {
  newCount: number;
  recurringCount: number;
}

// Nuevo = first_visit_at cae en el periodo. Recurrente = tiene una cita
// completada en el periodo y ya era cliente desde antes del periodo.
export function computeClientSegments(
  clients: ClientRow[],
  appointments: AppointmentRow[],
  from: string,
  to: string
): ClientSegments {
  const newCount = clients.filter(
    (c) => c.first_visit_at && inRange(c.first_visit_at, from, to)
  ).length;

  const clientsById = new Map(clients.map((c) => [c.id, c]));
  const recurringClientIds = new Set<string>();
  for (const appointment of appointments) {
    if (appointment.status !== "completed") continue;
    if (!inRange(appointment.appointment_date, from, to)) continue;
    const client = clientsById.get(appointment.client_id);
    if (client?.first_visit_at && client.first_visit_at.slice(0, 10) < from) {
      recurringClientIds.add(client.id);
    }
  }

  return { newCount, recurringCount: recurringClientIds.size };
}

export interface SalesBucket {
  label: string;
  incomeCents: number;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// Agrupa ingresos por día (rango <= 31 días), semana (<= 120 días) o mes
// (rangos mayores) para que el eje X del gráfico de Ventas siga siendo legible
// sin pedirle al usuario que elija la granularidad.
export function computeSalesBuckets(
  payments: PaymentRow[],
  from: string,
  to: string,
  timezone: string
): SalesBucket[] {
  const span = daysBetween(from, to);
  const granularity: "day" | "week" | "month" = span <= 31 ? "day" : span <= 120 ? "week" : "month";

  const buckets = new Map<string, number>();
  for (const payment of payments) {
    if (payment.status !== "paid") continue;
    const dateStr = formatInTimeZone(new Date(payment.paid_at), timezone, "yyyy-MM-dd");
    if (!inRange(dateStr, from, to)) continue;

    const key =
      granularity === "day" ? dateStr : granularity === "month" ? dateStr.slice(0, 7) : mondayOf(dateStr);
    buckets.set(key, (buckets.get(key) ?? 0) + payment.amount_cents);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([label, incomeCents]) => ({ label, incomeCents }));
}

export function computeCashDifferenceTotal(
  cashClosures: CashClosureRow[],
  from: string,
  to: string
): number {
  return cashClosures
    .filter((c) => inRange(c.closure_date, from, to))
    .reduce((sum, c) => sum + c.difference_cents, 0);
}
