import type { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SELECT_COLUMNS =
  "id, salon_id, category_id, name, description, features, price_cents, duration_min, image_url, is_active, sort_order, created_at, updated_at";

export async function listServices(
  supabase: SupabaseServerClient,
  salonId: string
) {
  const { data, error } = await supabase
    .from("services")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getNextServiceSortOrder(
  supabase: SupabaseServerClient,
  salonId: string
) {
  const { data, error } = await supabase
    .from("services")
    .select("sort_order")
    .eq("salon_id", salonId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.sort_order ?? 0) + 10;
}

export async function createService(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    categoryId: string;
    name: string;
    description: string | null;
    features: string[];
    priceCents: number;
    durationMin: number;
    imageUrl: string | null;
    sortOrder: number;
  }
) {
  const { data, error } = await supabase
    .from("services")
    .insert({
      salon_id: input.salonId,
      category_id: input.categoryId,
      name: input.name,
      description: input.description,
      features: input.features,
      price_cents: input.priceCents,
      duration_min: input.durationMin,
      image_url: input.imageUrl,
      sort_order: input.sortOrder,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateService(
  supabase: SupabaseServerClient,
  serviceId: string,
  input: {
    categoryId?: string;
    name?: string;
    description?: string | null;
    features?: string[];
    priceCents?: number;
    durationMin?: number;
    imageUrl?: string | null;
    isActive?: boolean;
  }
) {
  const patch: TablesUpdate<"services"> = {};
  if (input.categoryId !== undefined) patch.category_id = input.categoryId;
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.features !== undefined) patch.features = input.features;
  if (input.priceCents !== undefined) patch.price_cents = input.priceCents;
  if (input.durationMin !== undefined) patch.duration_min = input.durationMin;
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { data, error } = await supabase
    .from("services")
    .update(patch)
    .eq("id", serviceId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function getServiceById(
  supabase: SupabaseServerClient,
  serviceId: string
) {
  const { data, error } = await supabase
    .from("services")
    .select(SELECT_COLUMNS)
    .eq("id", serviceId)
    .single();

  if (error) throw error;
  return data;
}
