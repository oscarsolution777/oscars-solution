import type { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SELECT_COLUMNS =
  "id, salon_id, supplier_id, name, sku, unit, stock_qty, min_stock, cost_cents, price_cents, is_active, created_at, updated_at";

export async function listProducts(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createProductRow(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    name: string;
    sku: string | null;
    unit: string;
    minStock: number;
    costCents: number;
    priceCents: number;
    supplierId: string | null;
  }
) {
  const { data, error } = await supabase
    .from("products")
    .insert({
      salon_id: input.salonId,
      name: input.name,
      sku: input.sku,
      unit: input.unit,
      min_stock: input.minStock,
      cost_cents: input.costCents,
      price_cents: input.priceCents,
      supplier_id: input.supplierId,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProductRow(
  supabase: SupabaseServerClient,
  productId: string,
  input: {
    name?: string;
    sku?: string | null;
    unit?: string;
    minStock?: number;
    costCents?: number;
    priceCents?: number;
    supplierId?: string | null;
    isActive?: boolean;
  }
) {
  const patch: TablesUpdate<"products"> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.sku !== undefined) patch.sku = input.sku;
  if (input.unit !== undefined) patch.unit = input.unit;
  if (input.minStock !== undefined) patch.min_stock = input.minStock;
  if (input.costCents !== undefined) patch.cost_cents = input.costCents;
  if (input.priceCents !== undefined) patch.price_cents = input.priceCents;
  if (input.supplierId !== undefined) patch.supplier_id = input.supplierId;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
