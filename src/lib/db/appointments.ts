import type { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";
import { updateRequestRow } from "./requests";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SELECT_COLUMNS =
  "id, salon_id, request_id, client_id, appointment_date, total_cents, notes, status, created_at, updated_at";

export async function listAppointments(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase
    .from("appointments")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("appointment_date", { ascending: false });

  if (error) throw error;
  return data;
}

const ITEM_SELECT_COLUMNS = "id, appointment_id, service_id, staff_id, price_cents, created_at";

export async function listAppointmentItemsForAppointments(
  supabase: SupabaseServerClient,
  appointmentIds: string[]
) {
  if (appointmentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("appointment_items")
    .select(ITEM_SELECT_COLUMNS)
    .in("appointment_id", appointmentIds);

  if (error) throw error;
  return data;
}

// Confirma una solicitud: crea la cita + sus appointment_items (price_cents
// lo fija siempre el trigger snapshot_appointment_item) y marca la
// solicitud como confirmed. Tres llamadas no atómicas entre sí, mismo
// patrón ya aceptado para relaciones de esta app (service_staff, Fase 5).
export async function createAppointmentFromRequest(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    requestId: string;
    clientId: string;
    appointmentDate: string;
    items: { serviceId: string; staffId: string }[];
  }
) {
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      salon_id: input.salonId,
      request_id: input.requestId,
      client_id: input.clientId,
      appointment_date: input.appointmentDate,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (appointmentError) throw appointmentError;

  const { error: itemsError } = await supabase.from("appointment_items").insert(
    input.items.map((item) => ({
      appointment_id: appointment.id,
      service_id: item.serviceId,
      staff_id: item.staffId,
    }))
  );

  if (itemsError) throw itemsError;

  await updateRequestRow(supabase, input.requestId, {
    status: "confirmed",
    clientId: input.clientId,
  });

  const { data: refreshed, error: refreshError } = await supabase
    .from("appointments")
    .select(SELECT_COLUMNS)
    .eq("id", appointment.id)
    .single();

  if (refreshError) throw refreshError;
  return refreshed;
}

export async function updateAppointmentRow(
  supabase: SupabaseServerClient,
  appointmentId: string,
  input: {
    status?: string;
    appointmentDate?: string;
    notes?: string | null;
  }
) {
  const patch: TablesUpdate<"appointments"> = {};
  if (input.status !== undefined) patch.status = input.status;
  if (input.appointmentDate !== undefined) patch.appointment_date = input.appointmentDate;
  if (input.notes !== undefined) patch.notes = input.notes;

  const { data, error } = await supabase
    .from("appointments")
    .update(patch)
    .eq("id", appointmentId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
