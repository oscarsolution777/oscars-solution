import type { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SELECT_COLUMNS =
  "id, salon_id, client_id, amount_cents, method, status, reference, paid_at, created_at, updated_at";

export async function listPayments(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("paid_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createPaymentRow(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    clientId: string;
    amountCents: number;
    method: string;
    status: string;
    reference: string | null;
  }
) {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      salon_id: input.salonId,
      client_id: input.clientId,
      amount_cents: input.amountCents,
      method: input.method,
      status: input.status,
      reference: input.reference,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updatePaymentRow(
  supabase: SupabaseServerClient,
  paymentId: string,
  input: {
    amountCents?: number;
    method?: string;
    status?: string;
    reference?: string | null;
  }
) {
  const patch: TablesUpdate<"payments"> = {};
  if (input.amountCents !== undefined) patch.amount_cents = input.amountCents;
  if (input.method !== undefined) patch.method = input.method;
  if (input.status !== undefined) patch.status = input.status;
  if (input.reference !== undefined) patch.reference = input.reference;

  const { data, error } = await supabase
    .from("payments")
    .update(patch)
    .eq("id", paymentId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
