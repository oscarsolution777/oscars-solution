import type { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SELECT_COLUMNS =
  "id, salon_id, category, description, amount_cents, spent_at, supplier_id, created_at, updated_at";

export async function listExpenses(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("spent_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createExpenseRow(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    category: string;
    description: string | null;
    amountCents: number;
    spentAt: string;
    supplierId: string | null;
  }
) {
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      salon_id: input.salonId,
      category: input.category,
      description: input.description,
      amount_cents: input.amountCents,
      spent_at: input.spentAt,
      supplier_id: input.supplierId,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateExpenseRow(
  supabase: SupabaseServerClient,
  expenseId: string,
  input: {
    category?: string;
    description?: string | null;
    amountCents?: number;
    spentAt?: string;
    supplierId?: string | null;
  }
) {
  const patch: TablesUpdate<"expenses"> = {};
  if (input.category !== undefined) patch.category = input.category;
  if (input.description !== undefined) patch.description = input.description;
  if (input.amountCents !== undefined) patch.amount_cents = input.amountCents;
  if (input.spentAt !== undefined) patch.spent_at = input.spentAt;
  if (input.supplierId !== undefined) patch.supplier_id = input.supplierId;

  const { data, error } = await supabase
    .from("expenses")
    .update(patch)
    .eq("id", expenseId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExpenseRow(supabase: SupabaseServerClient, expenseId: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) throw error;
}
