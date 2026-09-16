import { getLocale, getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listPayments } from "@/lib/db/payments";
import { listAppointments, listAppointmentItemsForAppointments } from "@/lib/db/appointments";
import { listClients } from "@/lib/db/clients";
import { listServices } from "@/lib/db/services";
import { listStaff } from "@/lib/db/staff";
import { listProducts } from "@/lib/db/products";
import { resolvePeriod } from "@/lib/utils/period";
import {
  computeTopServices,
  computeStaffWorkload,
  computeClientSegments,
  computeSalesBuckets,
  inRange,
} from "@/lib/reports/aggregations";
import { EmptyState } from "@/components/shared/empty-state";
import { ReportsView } from "./_components/reports-view";

const ALLOWED_ROLES = ["owner", "admin"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const session = await requireAuth();
  const locale = await getLocale();
  const salon = session.activeMembership?.salon;

  if (!salon || !session.activeMembership) {
    const t = await getTranslations("dashboard");
    const tAuth = await getTranslations("auth.login");
    return <EmptyState title={t("welcomeTitle")} description={tAuth("noMembership")} />;
  }

  if (!ALLOWED_ROLES.includes(session.activeMembership.role)) {
    const t = await getTranslations("reports");
    return <EmptyState title={t("errors.forbiddenTitle")} description={t("errors.forbidden")} />;
  }

  const params = await searchParams;
  const todayStr = formatInTimeZone(new Date(), salon.timezone, "yyyy-MM-dd");
  const period = resolvePeriod(params, todayStr);

  const supabase = await createClient();
  const [payments, appointments, clients, services, staff, products] = await Promise.all([
    listPayments(supabase, salon.id),
    listAppointments(supabase, salon.id),
    listClients(supabase, salon.id),
    listServices(supabase, salon.id),
    listStaff(supabase, salon.id),
    listProducts(supabase, salon.id),
  ]);

  const appointmentItems = await listAppointmentItemsForAppointments(
    supabase,
    appointments.map((a) => a.id)
  );

  const appointmentsById = new Map(appointments.map((a) => [a.id, a]));
  const servicesById = new Map(services.map((s) => [s.id, s]));
  const staffById = new Map(staff.map((s) => [s.id, s]));

  const salesBuckets = computeSalesBuckets(payments, period.from, period.to, salon.timezone);
  const paymentsInPeriod = payments.filter((p) => inRange(p.paid_at, period.from, period.to));

  const topServices = computeTopServices(
    appointmentItems,
    appointmentsById,
    servicesById,
    period.from,
    period.to
  );
  const staffWorkload = computeStaffWorkload(
    appointmentItems,
    appointmentsById,
    staffById,
    period.from,
    period.to
  );
  const clientSegments = computeClientSegments(clients, appointments, period.from, period.to);

  const activeProducts = products.filter((p) => p.is_active);
  const lowStockProducts = activeProducts.filter((p) => p.stock_qty <= p.min_stock);
  const inventoryValueCents = activeProducts.reduce(
    (sum, p) => sum + p.stock_qty * p.cost_cents,
    0
  );

  return (
    <ReportsView
      period={period}
      currency={salon.currency}
      timezone={salon.timezone}
      locale={locale}
      sales={{ buckets: salesBuckets, payments: paymentsInPeriod }}
      clients={{ segments: clientSegments, clients }}
      services={{ rows: topServices }}
      staff={{ rows: staffWorkload }}
      inventory={{ products: activeProducts, lowStockProducts, inventoryValueCents }}
    />
  );
}
