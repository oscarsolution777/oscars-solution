import type { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SELECT_COLUMNS =
  "id, salon_id, name, sort_order, is_active, created_at, updated_at";

export async function listServiceCategories(
  supabase: SupabaseServerClient,
  salonId: string
) {
  const { data, error } = await supabase
    .from("service_categories")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getNextCategorySortOrder(
  supabase: SupabaseServerClient,
  salonId: string
) {
  const { data, error } = await supabase
    .from("service_categories")
    .select("sort_order")
    .eq("salon_id", salonId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.sort_order ?? 0) + 10;
}

export async function createServiceCategory(
  supabase: SupabaseServerClient,
  input: { salonId: string; name: string; sortOrder: number }
) {
  const { data, error } = await supabase
    .from("service_categories")
    .insert({
      salon_id: input.salonId,
      name: input.name,
      sort_order: input.sortOrder,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateServiceCategory(
  supabase: SupabaseServerClient,
  categoryId: string,
  input: { name?: string; isActive?: boolean }
) {
  const patch: TablesUpdate<"service_categories"> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { data, error } = await supabase
    .from("service_categories")
    .update(patch)
    .eq("id", categoryId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
