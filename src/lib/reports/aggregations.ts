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
type StockMovementRow = Tables<"stock_movements">;
type ExpenseRow = Tables<"expenses">;
type StaffPayoutRow = Tables<"staff_payouts">;

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

function addMonthKey(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const total = year * 12 + (month - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

// Enumera todas las claves de bucket entre from/to a una granularidad dada,
// aunque no haya habido ningún pago ese día/semana/mes — así el eje X del
// gráfico siempre representa el rango completo del periodo, con cero donde
// no hubo ingreso, en vez de saltarse los huecos (CLAUDE.md sección 9,
// "mes completo" del Dashboard).
function enumerateBucketKeys(from: string, to: string, granularity: "day" | "week" | "month"): string[] {
  const keys: string[] = [];

  if (granularity === "month") {
    let key = from.slice(0, 7);
    const last = to.slice(0, 7);
    while (key <= last) {
      keys.push(key);
      key = addMonthKey(key, 1);
    }
    return keys;
  }

  if (granularity === "week") {
    let key = mondayOf(from);
    const last = mondayOf(to);
    while (key <= last) {
      keys.push(key);
      const d = new Date(`${key}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 7);
      key = d.toISOString().slice(0, 10);
    }
    return keys;
  }

  let key = from;
  while (key <= to) {
    keys.push(key);
    const d = new Date(`${key}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    key = d.toISOString().slice(0, 10);
  }
  return keys;
}

// Agrupa ingresos por día (rango <= 31 días), semana (<= 120 días) o mes
// (rangos mayores) para que el eje X del gráfico de Ventas siga siendo legible
// sin pedirle al usuario que elija la granularidad. Siempre devuelve un punto
// por cada día/semana/mes del rango (relleno en cero), no solo los que
// tuvieron ingreso, para que el gráfico muestre el periodo completo.
export function computeSalesBuckets(
  payments: PaymentRow[],
  from: string,
  to: string,
  timezone: string
): SalesBucket[] {
  const span = daysBetween(from, to);
  const granularity: "day" | "week" | "month" = span <= 31 ? "day" : span <= 120 ? "week" : "month";

  const buckets = new Map<string, number>(enumerateBucketKeys(from, to, granularity).map((key) => [key, 0]));
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

export interface CashDifferencePoint {
  label: string; // closure_date (yyyy-MM-dd), sin conversión de zona horaria (es una columna "date" pura)
  differenceCents: number;
}

// Serie de la diferencia de caja por día para el gráfico de tendencia de
// Cuadre de caja. A diferencia de computeCashDifferenceTotal (un solo número
// acumulado), aquí se conserva un punto por cierre para poder graficarlo.
export function computeCashDifferenceTrend(
  cashClosures: CashClosureRow[],
  from: string,
  to: string
): CashDifferencePoint[] {
  return cashClosures
    .filter((c) => inRange(c.closure_date, from, to))
    .sort((a, b) => (a.closure_date < b.closure_date ? -1 : a.closure_date > b.closure_date ? 1 : 0))
    .map((c) => ({ label: c.closure_date, differenceCents: c.difference_cents }));
}

export interface PaymentMethodSlice {
  method: string;
  amountCents: number;
}

// Distribución de cobros pagados por método (efectivo/tarjeta/transferencia/
// otro) en el periodo, para el donut de Pagos.
export function computePaymentMethodBreakdown(
  payments: PaymentRow[],
  from: string,
  to: string
): PaymentMethodSlice[] {
  const byMethod = new Map<string, number>();
  for (const payment of payments) {
    if (payment.status !== "paid") continue;
    if (!inRange(payment.paid_at, from, to)) continue;
    byMethod.set(payment.method, (byMethod.get(payment.method) ?? 0) + payment.amount_cents);
  }
  return Array.from(byMethod.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([method, amountCents]) => ({ method, amountCents }));
}

export interface ExpenseCategorySlice {
  category: string;
  amountCents: number;
}

// Distribución de gastos por categoría (texto libre, sección 6 de CLAUDE.md)
// en el periodo, para el donut de Finanzas.
export function computeExpensesByCategory(
  expenses: ExpenseRow[],
  from: string,
  to: string
): ExpenseCategorySlice[] {
  const byCategory = new Map<string, number>();
  for (const expense of expenses) {
    if (!inRange(expense.spent_at, from, to)) continue;
    byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amount_cents);
  }
  return Array.from(byCategory.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([category, amountCents]) => ({ category, amountCents }));
}

export interface FinanceMonthPoint {
  label: string; // yyyy-MM
  incomeCents: number;
  expensesCents: number;
  payoutsCents: number;
}

// Tendencia mensual de ingresos/gastos/nóminas para el gráfico de barras
// agrupadas de Finanzas. A diferencia del resto de funciones de este archivo
// (que reciben from/to de un único periodo), esta arma sus propios N meses
// consecutivos porque el gráfico necesita varios puntos discretos, no un
// rango continuo.
export function computeMonthlyFinanceTrend(
  payments: PaymentRow[],
  expenses: ExpenseRow[],
  payouts: StaffPayoutRow[],
  monthsBack: number,
  timezone: string
): FinanceMonthPoint[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const points = new Map<string, FinanceMonthPoint>(
    months.map((label) => [label, { label, incomeCents: 0, expensesCents: 0, payoutsCents: 0 }])
  );

  for (const payment of payments) {
    if (payment.status !== "paid") continue;
    const key = formatInTimeZone(new Date(payment.paid_at), timezone, "yyyy-MM");
    const point = points.get(key);
    if (point) point.incomeCents += payment.amount_cents;
  }

  for (const expense of expenses) {
    const key = expense.spent_at.slice(0, 7);
    const point = points.get(key);
    if (point) point.expensesCents += expense.amount_cents;
  }

  for (const payout of payouts) {
    if (payout.status !== "paid" || !payout.paid_at) continue;
    const key = formatInTimeZone(new Date(payout.paid_at), timezone, "yyyy-MM");
    const point = points.get(key);
    if (point) point.payoutsCents += payout.total_cents;
  }

  return Array.from(points.values());
}

export interface StockMovementPoint {
  label: string;
  inQty: number;
  outQty: number;
}

// Entradas vs salidas de stock por día/semana/mes (mismo criterio de
// granularidad automática que computeSalesBuckets), para el gráfico de
// movimientos de Inventario. "Salida" agrupa out/loss/adjustment: la tabla
// stock_movements no distingue si un ajuste sumó o restó stock, así que se
// trata como una simplificación visual (el detalle exacto sigue disponible
// en la tabla de movimientos).
export function computeStockMovementTrend(
  movements: StockMovementRow[],
  from: string,
  to: string,
  timezone: string
): StockMovementPoint[] {
  const span = daysBetween(from, to);
  const granularity: "day" | "week" | "month" = span <= 31 ? "day" : span <= 120 ? "week" : "month";

  const buckets = new Map<string, StockMovementPoint>();
  for (const movement of movements) {
    const dateStr = formatInTimeZone(new Date(movement.created_at), timezone, "yyyy-MM-dd");
    if (!inRange(dateStr, from, to)) continue;

    const key =
      granularity === "day" ? dateStr : granularity === "month" ? dateStr.slice(0, 7) : mondayOf(dateStr);
    const point = buckets.get(key) ?? { label: key, inQty: 0, outQty: 0 };
    if (movement.type === "in") {
      point.inQty += movement.qty;
    } else {
      point.outQty += movement.qty;
    }
    buckets.set(key, point);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, point]) => point);
}
