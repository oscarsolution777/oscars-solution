import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function listServiceProductsForServices(
  supabase: SupabaseServerClient,
  serviceIds: string[]
) {
  if (serviceIds.length === 0) return [];

  const { data, error } = await supabase
    .from("service_products")
    .select("id, service_id, product_id, qty")
    .in("service_id", serviceIds);

  if (error) throw error;
  return data;
}

// Reemplaza todo el conjunto de productos consumidos por un servicio. No es
// atómico entre el delete y el insert (mismo patrón ya aceptado en
// setServiceStaffAssignments, Fase 5).
export async function setServiceProducts(
  supabase: SupabaseServerClient,
  serviceId: string,
  items: { productId: string; qty: number }[]
) {
  const { error: deleteError } = await supabase
    .from("service_products")
    .delete()
    .eq("service_id", serviceId);
  if (deleteError) throw deleteError;

  if (items.length === 0) return;

  const { error: insertError } = await supabase.from("service_products").insert(
    items.map((item) => ({
      service_id: serviceId,
      product_id: item.productId,
      qty: item.qty,
    }))
  );
  if (insertError) throw insertError;
}
