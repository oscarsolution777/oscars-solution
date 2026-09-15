import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function listServiceStaffForSalon(
  supabase: SupabaseServerClient,
  serviceIds: string[]
) {
  if (serviceIds.length === 0) return [];

  const { data, error } = await supabase
    .from("service_staff")
    .select("service_id, staff_id")
    .in("service_id", serviceIds);

  if (error) throw error;
  return data;
}

export async function listServiceIdsForStaff(
  supabase: SupabaseServerClient,
  staffId: string
) {
  const { data, error } = await supabase
    .from("service_staff")
    .select("service_id")
    .eq("staff_id", staffId);

  if (error) throw error;
  return data.map((row) => row.service_id);
}

// Reemplaza todo el conjunto de servicios asignados a un trabajador. No es
// atómico entre el delete y el insert (dos llamadas separadas a PostgREST),
// aceptable para esta acción de baja frecuencia (decisión documentada en el
// plan de la Fase 5).
export async function setServiceStaffAssignments(
  supabase: SupabaseServerClient,
  staffId: string,
  serviceIds: string[]
) {
  const { error: deleteError } = await supabase
    .from("service_staff")
    .delete()
    .eq("staff_id", staffId);
  if (deleteError) throw deleteError;

  if (serviceIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("service_staff")
    .insert(serviceIds.map((serviceId) => ({ service_id: serviceId, staff_id: staffId })));
  if (insertError) throw insertError;
}
