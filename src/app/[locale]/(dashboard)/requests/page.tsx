import { getLocale, getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listRequests, listRequestItemsForRequests } from "@/lib/db/requests";
import { listAppointments, listAppointmentItemsForAppointments } from "@/lib/db/appointments";
import { listClients } from "@/lib/db/clients";
import { listServices } from "@/lib/db/services";
import { listStaff } from "@/lib/db/staff";
import { listServiceStaffForSalon } from "@/lib/db/service-staff";
import { resolvePeriod, type PeriodSearchParams } from "@/lib/utils/period";
import { formatCalendarDate } from "@/lib/utils/dates";
import { computeNoShowRate, inRange } from "@/lib/reports/aggregations";
import { EmptyState } from "@/components/shared/empty-state";
import { RequestsView } from "./_components/requests-view";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<PeriodSearchParams>;
}) {
  const session = await requireAuth();
  const locale = await getLocale();
  const salon = session.activeMembership?.salon;

  if (!salon || !session.activeMembership) {
    const t = await getTranslations("dashboard");
    const tAuth = await getTranslations("auth.login");
    return <EmptyState title={t("welcomeTitle")} description={tAuth("noMembership")} />;
  }

  const supabase = await createClient();
  const [requests, appointments, clients, services, staff] = await Promise.all([
    listRequests(supabase, salon.id),
    listAppointments(supabase, salon.id),
    listClients(supabase, salon.id),
    listServices(supabase, salon.id),
    listStaff(supabase, salon.id),
  ]);

  const [requestItems, appointmentItems, serviceStaffRows] = await Promise.all([
    listRequestItemsForRequests(
      supabase,
      requests.map((request) => request.id)
    ),
    listAppointmentItemsForAppointments(
      supabase,
      appointments.map((appointment) => appointment.id)
    ),
    listServiceStaffForSalon(
      supabase,
      services.map((service) => service.id)
    ),
  ]);

  // Punto 7 del bloque de ajustes: los formularios de solicitud/cita ya no
  // muestran TODOS los trabajadores activos para cualquier servicio -- se
  // filtra a los que `service_staff` tiene asignados a ese servicio
  // concreto. Se construye aquí (un solo query) en vez de en cada panel.
  const serviceStaffMap: Record<string, string[]> = {};
  for (const row of serviceStaffRows) {
    (serviceStaffMap[row.service_id] ??= []).push(row.staff_id);
  }

  const todayStr = formatInTimeZone(new Date(), salon.timezone, "yyyy-MM-dd");

  const pendingRequestsCount = requests.filter((request) => request.status === "pending").length;
  const todayAppointmentsCount = appointments.filter(
    (appointment) => appointment.appointment_date === todayStr && appointment.status === "scheduled"
  ).length;

  const params = await searchParams;
  const period = resolvePeriod(params, todayStr);
  const { from, to } = period;

  const { rate: noShowRate } = computeNoShowRate(appointments, from, to);
  const completedRevenueCents = appointments
    .filter(
      (appointment) =>
        appointment.status === "completed" && inRange(appointment.appointment_date, from, to)
    )
    .reduce((sum, appointment) => sum + appointment.total_cents, 0);

  const tPeriod = await getTranslations("requests.period");
  const periodLabel =
    period.preset === "custom"
      ? `${formatCalendarDate(period.from, locale, "P")} – ${formatCalendarDate(period.to, locale, "P")}`
      : tPeriod(period.preset);

  return (
    <RequestsView
      requests={requests}
      requestItems={requestItems}
      appointments={appointments}
      appointmentItems={appointmentItems}
      clients={clients.filter((client) => client.is_active)}
      services={services.filter((service) => service.is_active)}
      staff={staff.filter((member) => member.is_active)}
      serviceStaffMap={serviceStaffMap}
      period={period}
      kpis={{
        pendingRequestsCount,
        todayAppointmentsCount,
        noShowRate,
        completedRevenueCents,
      }}
      periodLabel={periodLabel}
      currency={salon.currency}
      locale={locale}
    />
  );
}
