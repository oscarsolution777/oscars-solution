import type { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SELECT_COLUMNS =
  "id, salon_id, public_code, client_id, client_name, client_phone, client_email, preferred_date, status, source, created_at, updated_at";

export async function listRequests(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase
    .from("requests")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

const ITEM_SELECT_COLUMNS =
  "id, request_id, service_id, staff_id, service_name_snapshot, price_cents_snapshot, created_at";

export async function listRequestItemsForRequests(
  supabase: SupabaseServerClient,
  requestIds: string[]
) {
  if (requestIds.length === 0) return [];

  const { data, error } = await supabase
    .from("request_items")
    .select(ITEM_SELECT_COLUMNS)
    .in("request_id", requestIds);

  if (error) throw error;
  return data;
}

// Inserta la solicitud y sus items en dos llamadas separadas (no atómico
// entre ambas, mismo patrón ya aceptado para service_staff en la Fase 5):
// service_name_snapshot/price_cents_snapshot los fija siempre el trigger
// snapshot_request_item, nunca se envían desde aquí.
export async function createRequestWithItems(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    clientId: string | null;
    clientName: string;
    clientPhone: string | null;
    clientEmail: string | null;
    preferredDate: string | null;
    items: { serviceId: string; staffId: string | null }[];
    source: "manual" | "qr";
  }
) {
  const { data: request, error: requestError } = await supabase
    .from("requests")
    .insert({
      salon_id: input.salonId,
      client_id: input.clientId,
      client_name: input.clientName,
      client_phone: input.clientPhone,
      client_email: input.clientEmail,
      preferred_date: input.preferredDate,
      source: input.source,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (requestError) throw requestError;

  const { error: itemsError } = await supabase.from("request_items").insert(
    input.items.map((item) => ({
      request_id: request.id,
      service_id: item.serviceId,
      staff_id: item.staffId,
    }))
  );

  if (itemsError) throw itemsError;

  return request;
}

export async function getRequestById(supabase: SupabaseServerClient, requestId: string) {
  const { data, error } = await supabase
    .from("requests")
    .select(SELECT_COLUMNS)
    .eq("id", requestId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateRequestRow(
  supabase: SupabaseServerClient,
  requestId: string,
  input: {
    status?: string;
    clientId?: string | null;
  }
) {
  const patch: TablesUpdate<"requests"> = {};
  if (input.status !== undefined) patch.status = input.status;
  if (input.clientId !== undefined) patch.client_id = input.clientId;

  const { data, error } = await supabase
    .from("requests")
    .update(patch)
    .eq("id", requestId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

// Único punto de lectura del portal público: localiza la solicitud
// exclusivamente por public_code vía la función security definer
// get_request_status (migración 0013) — nunca un SELECT directo de la tabla.
export type PublicRequestStatus = {
  salonName: string;
  currency: string;
  timezone: string;
  status: string;
  clientName: string;
  preferredDate: string | null;
  createdAt: string;
  items: { serviceName: string; priceCents: number; staffFullName: string | null }[];
  appointment: { appointmentDate: string; status: string } | null;
};

export async function getRequestStatusByPublicCode(
  supabase: SupabaseServerClient,
  publicCode: string
): Promise<PublicRequestStatus | null> {
  const { data, error } = await supabase.rpc("get_request_status", {
    p_public_code: publicCode,
  });

  if (error) throw error;
  return (data as PublicRequestStatus | null) ?? null;
}
