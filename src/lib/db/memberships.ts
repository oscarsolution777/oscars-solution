import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Devuelve las membresías activas del usuario con los datos del salón
// embebidos. Una persona puede tener varias filas (cadena de salones); el
// selector de salón activo se construye en Fase 10 — por ahora se usa la
// primera membresía activa como salón "actual".
export async function getActiveMembershipsForUser(
  supabase: SupabaseServerClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("memberships")
    .select(
      "id, role, is_active, salon:salons(id, name, slug, currency, timezone, default_locale, subscription_status, is_demo, demo_expires_at)"
    )
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) throw error;
  return data;
}
