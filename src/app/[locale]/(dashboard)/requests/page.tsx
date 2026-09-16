import { getLocale, getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listRequests, listRequestItemsForRequests } from "@/lib/db/requests";
import { listAppointments, listAppointmentItemsForAppointments } from "@/lib/db/appointments";
import { listClients } from "@/lib/db/clients";
import { listServices } from "@/lib/db/services";
import { listStaff } from "@/lib/db/staff";
import { EmptyState } from "@/components/shared/empty-state";
import { RequestsView } from "./_components/requests-view";

export default async function RequestsPage() {
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

  const [requestItems, appointmentItems] = await Promise.all([
    listRequestItemsForRequests(
      supabase,
      requests.map((request) => request.id)
    ),
    listAppointmentItemsForAppointments(
      supabase,
      appointments.map((appointment) => appointment.id)
    ),
  ]);

  const todayStr = formatInTimeZone(new Date(), salon.timezone, "yyyy-MM-dd");
  const currentMonthPrefix = todayStr.slice(0, 7);

  const pendingRequestsCount = requests.filter((request) => request.status === "pending").length;
  const todayAppointmentsCount = appointments.filter(
    (appointment) => appointment.appointment_date === todayStr && appointment.status === "scheduled"
  ).length;

  const appointmentsThisMonth = appointments.filter((appointment) =>
    appointment.appointment_date.startsWith(currentMonthPrefix)
  );
  const completedThisMonth = appointmentsThisMonth.filter(
    (appointment) => appointment.status === "completed"
  );
  const noShowThisMonth = appointmentsThisMonth.filter(
    (appointment) => appointment.status === "no_show"
  );
  const noShowRate =
    completedThisMonth.length + noShowThisMonth.length > 0
      ? noShowThisMonth.length / (completedThisMonth.length + noShowThisMonth.length)
      : 0;
  const completedRevenueCents = completedThisMonth.reduce(
    (sum, appointment) => sum + appointment.total_cents,
    0
  );

  return (
    <RequestsView
      requests={requests}
      requestItems={requestItems}
      appointments={appointments}
      appointmentItems={appointmentItems}
      clients={clients.filter((client) => client.is_active)}
      services={services.filter((service) => service.is_active)}
      staff={staff.filter((member) => member.is_active)}
      kpis={{
        pendingRequestsCount,
        todayAppointmentsCount,
        noShowRate,
        completedRevenueCents,
      }}
      currency={salon.currency}
      timezone={salon.timezone}
      locale={locale}
    />
  );
}
