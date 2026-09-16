import type { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SELECT_COLUMNS = "id, salon_id, name, phone, email, notes, is_active, created_at, updated_at";

export async function listSuppliers(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase
    .from("suppliers")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createSupplierRow(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
  }
) {
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      salon_id: input.salonId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateSupplierRow(
  supabase: SupabaseServerClient,
  supplierId: string,
  input: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    isActive?: boolean;
  }
) {
  const patch: TablesUpdate<"suppliers"> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.email !== undefined) patch.email = input.email;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { data, error } = await supabase
    .from("suppliers")
    .update(patch)
    .eq("id", supplierId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
