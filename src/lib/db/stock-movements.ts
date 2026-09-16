import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SELECT_COLUMNS = "id, salon_id, product_id, type, qty, reason, created_by, created_at";

export async function listStockMovements(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase
    .from("stock_movements")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return data;
}

// Los errores de Postgres (check constraint del tipo/qty, o el trigger
// apply_stock_movement rechazando stock negativo o un producto de otro
// salón) se propagan tal cual — la Server Action decide cómo traducirlos.
export async function createStockMovementRow(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    productId: string;
    type: string;
    qty: number;
    reason: string | null;
    createdBy: string | null;
  }
) {
  const { data, error } = await supabase
    .from("stock_movements")
    .insert({
      salon_id: input.salonId,
      product_id: input.productId,
      type: input.type,
      qty: input.qty,
      reason: input.reason,
      created_by: input.createdBy,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
