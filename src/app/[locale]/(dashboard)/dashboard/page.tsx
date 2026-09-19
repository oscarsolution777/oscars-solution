import { getLocale, getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listPayments } from "@/lib/db/payments";
import { listAppointments, listAppointmentItemsForAppointments } from "@/lib/db/appointments";
import { listRequests } from "@/lib/db/requests";
import { listProducts } from "@/lib/db/products";
import { listClients } from "@/lib/db/clients";
import { listStaff } from "@/lib/db/staff";
import { listServices } from "@/lib/db/services";
import { listCashClosures } from "@/lib/db/cash-closures";
import { getPresetRange } from "@/lib/utils/period";
import {
  sumPaidIncomeCents,
  computeNoShowRate,
  computeTopServices,
  computeStaffWorkload,
  computeClientSegments,
  computeCashDifferenceTotal,
  computeSalesBuckets,
} from "@/lib/reports/aggregations";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardView } from "./_components/dashboard-view";

export default async function DashboardPage() {
  const session = await requireAuth();
  const locale = await getLocale();
  const salon = session.activeMembership?.salon;

  if (!salon || !session.activeMembership) {
    const t = await getTranslations("dashboard");
    const tAuth = await getTranslations("auth.login");
    return <EmptyState title={t("welcomeTitle")} description={tAuth("noMembership")} />;
  }

  const role = session.activeMembership.role;
  const supabase = await createClient();

  const [payments, appointments, requests, products, clients, staff, services, cashClosures] =
    await Promise.all([
      listPayments(supabase, salon.id),
      listAppointments(supabase, salon.id),
      listRequests(supabase, salon.id),
      listProducts(supabase, salon.id),
      listClients(supabase, salon.id),
      listStaff(supabase, salon.id),
      listServices(supabase, salon.id),
      listCashClosures(supabase, salon.id),
    ]);

  const appointmentItems = await listAppointmentItemsForAppointments(
    supabase,
    appointments.map((a) => a.id)
  );

  const todayStr = formatInTimeZone(new Date(), salon.timezone, "yyyy-MM-dd");
  const { from, to } = getPresetRange("thisMonth", todayStr);

  const pendingRequestsCount = requests.filter((r) => r.status === "pending").length;
  const todayAppointmentsCount = appointments.filter(
    (a) => a.appointment_date === todayStr && a.status === "scheduled"
  ).length;
  const lowStockProducts = products.filter((p) => p.is_active && p.stock_qty <= p.min_stock);

  if (role === "reception") {
    return (
      <DashboardView
        variant="reception"
        locale={locale}
        currency={salon.currency}
        operational={{ pendingRequestsCount, todayAppointmentsCount, lowStockProducts }}
      />
    );
  }

  const appointmentsById = new Map(appointments.map((a) => [a.id, a]));
  const servicesById = new Map(services.map((s) => [s.id, s]));
  const staffById = new Map(staff.map((s) => [s.id, s]));

  const incomeCents = sumPaidIncomeCents(payments, from, to);
  const { completed, noShow, rate: noShowRate } = computeNoShowRate(appointments, from, to);
  const avgTicketCents = completed > 0 ? Math.round(incomeCents / completed) : 0;
  const topServices = computeTopServices(appointmentItems, appointmentsById, servicesById, from, to).slice(
    0,
    5
  );
  const staffWorkload = computeStaffWorkload(appointmentItems, appointmentsById, staffById, from, to);
  const clientSegments = computeClientSegments(clients, appointments, from, to);
  const cashDifferenceCents = computeCashDifferenceTotal(cashClosures, from, to);
  const revenueTrend = computeSalesBuckets(payments, from, to, salon.timezone);

  return (
    <DashboardView
      variant="full"
      locale={locale}
      currency={salon.currency}
      operational={{ pendingRequestsCount, todayAppointmentsCount, lowStockProducts }}
      financial={{
        incomeCents,
        completedCount: completed,
        noShowRate,
        avgTicketCents,
        cashDifferenceCents,
      }}
      revenueTrend={revenueTrend}
      topServices={topServices}
      staffWorkload={staffWorkload}
      clientSegments={clientSegments}
      completionBreakdown={{ completed, noShow }}
    />
  );
}
