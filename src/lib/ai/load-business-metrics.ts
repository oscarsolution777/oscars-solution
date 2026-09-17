import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import type { createClient } from "@/lib/supabase/server";
import { listPayments } from "@/lib/db/payments";
import { listAppointments, listAppointmentItemsForAppointments } from "@/lib/db/appointments";
import { listRequests } from "@/lib/db/requests";
import { listProducts } from "@/lib/db/products";
import { listClients } from "@/lib/db/clients";
import { listStaff } from "@/lib/db/staff";
import { listServices } from "@/lib/db/services";
import { listCashClosures } from "@/lib/db/cash-closures";
import { getLast30DaysRange, buildBusinessMetrics } from "./build-metrics";
import type { BusinessMetrics } from "./types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Misma carga de datos que dashboard/page.tsx y reports/page.tsx, factorizada
// aquí porque tanto la carga inicial de /ai como la Server Action de
// "Regenerar" necesitan exactamente las mismas 8 consultas + el cálculo de
// BusinessMetrics.
export async function loadBusinessMetrics(
  supabase: SupabaseServerClient,
  salon: { id: string; currency: string; timezone: string }
): Promise<BusinessMetrics> {
  const todayStr = formatInTimeZone(new Date(), salon.timezone, "yyyy-MM-dd");
  const { from, to } = getLast30DaysRange(todayStr);

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

  return buildBusinessMetrics({
    currency: salon.currency,
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
  });
}
