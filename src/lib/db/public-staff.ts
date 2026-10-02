import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Portal público (Fase 2): único acceso de un visitante anónimo a datos de
// staff, vía la función security definer list_public_staff_for_salon
// (migración 0013) — nunca expone phone/base_salary_cents/hired_at.
export async function listPublicStaffForSalon(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase.rpc("list_public_staff_for_salon", {
    p_salon_id: salonId,
  });

  if (error) throw error;
  return data as { id: string; full_name: string }[];
}

// Punto 7 del bloque de ajustes: pares (service_id, staff_id) para filtrar
// el selector de "trabajador preferido" por servicio, vía
// list_public_service_staff_for_salon (migración 0026) — mismo criterio de
// exposición mínima que listPublicStaffForSalon.
export async function listPublicServiceStaffForSalon(
  supabase: SupabaseServerClient,
  salonId: string
) {
  const { data, error } = await supabase.rpc("list_public_service_staff_for_salon", {
    p_salon_id: salonId,
  });

  if (error) throw error;
  return data as { service_id: string; staff_id: string }[];
}
