import type { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SELECT_COLUMNS =
  "id, salon_id, full_name, phone, email, notes, preferences, first_visit_at, last_visit_at, total_spent_cents, is_active, created_at, updated_at";

export async function listClients(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase
    .from("clients")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createClientRow(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    fullName: string;
    phone: string;
    email: string | null;
    notes: string | null;
    preferences: string[];
  }
) {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      salon_id: input.salonId,
      full_name: input.fullName,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
      preferences: input.preferences,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateClientRow(
  supabase: SupabaseServerClient,
  clientId: string,
  input: {
    fullName?: string;
    phone?: string;
    email?: string | null;
    notes?: string | null;
    preferences?: string[];
    isActive?: boolean;
  }
) {
  const patch: TablesUpdate<"clients"> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.email !== undefined) patch.email = input.email;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.preferences !== undefined) patch.preferences = input.preferences;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { data, error } = await supabase
    .from("clients")
    .update(patch)
    .eq("id", clientId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
