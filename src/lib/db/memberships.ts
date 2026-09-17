import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type UpdateResult = { ok: true } | { ok: false; error: string };

// Devuelve las membresías activas del usuario con los datos del salón
// embebidos. Una persona puede tener varias filas (cadena de salones); el
// salón "activo" entre ellas lo elige getCurrentSession() vía la cookie
// active_salon_id (Fase 10, selector de salón).
export async function getActiveMembershipsForUser(
  supabase: SupabaseServerClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("memberships")
    .select(
      "id, role, is_active, salon:salons(id, name, slug, logo_url, phone, address, currency, timezone, default_locale, subscription_status, is_demo, demo_expires_at)"
    )
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) throw error;
  return data;
}

// Fase 10 — Configuración > Usuarios: solo el owner puede listar los
// miembros de su salón (la función SQL lo exige internamente) y ver su
// email, que no está expuesto por RLS directa sobre profiles/auth.users.
export async function listSalonMembers(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase.rpc("list_salon_members", { p_salon_id: salonId });
  if (error) throw error;
  return data;
}

export async function updateSalonMembership(
  supabase: SupabaseServerClient,
  input: { membershipId: string; role: string; isActive: boolean }
): Promise<UpdateResult> {
  const { data, error } = await supabase.rpc("update_salon_membership", {
    p_membership_id: input.membershipId,
    p_role: input.role,
    p_is_active: input.isActive,
  });
  if (error) throw error;
  return data as UpdateResult;
}
