import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const AUDIT_LOG_LIMIT = 100;

// Select directo: la RLS de audit_log (migración 0017) ya restringe la
// lectura al owner del salón, mismo patrón que el resto de listas del panel.
export async function listAuditLog(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, entity, entity_id, action, diff, created_at, user_id")
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false })
    .limit(AUDIT_LOG_LIMIT);

  if (error) throw error;
  return data;
}

// Punto 18 del bloque de ajustes: un cambio hecho por un platform admin
// (soporte de Oscar's Solution, migración 0022) se audita igual que
// cualquier otro -- pero su membership se excluye a propósito de
// list_salon_members (la dueña no debe ver ni tocar esa fila), así que su
// user_id no aparece en `members` y la pestaña de Auditoría lo mostraba como
// "Usuario desconocido" (parecía un bug/edición fantasma). Se identifica
// aquí con la misma función is_platform_admin_user() que ya usa
// list_salon_members/update_salon_membership, para etiquetarlo en la UI
// como soporte real en vez de "desconocido".
export async function getPlatformAdminUserIds(
  supabase: SupabaseServerClient,
  userIds: string[]
): Promise<Set<string>> {
  const distinctIds = [...new Set(userIds)];
  if (distinctIds.length === 0) return new Set();

  const results = await Promise.all(
    distinctIds.map(async (userId) => {
      const { data, error } = await supabase.rpc("is_platform_admin_user", {
        p_user_id: userId,
      });
      if (error) throw error;
      return { userId, isPlatformAdmin: data === true };
    })
  );

  return new Set(results.filter((r) => r.isPlatformAdmin).map((r) => r.userId));
}

// Las filas solo traen user_id (sin nombre): la pestaña de Auditoría ya
// carga list_salon_members() para la pestaña de Usuarios, y cruza ambos por
// user_id en el cliente en vez de pedir el nombre aquí también.
export async function logAuditEvent(
  supabase: SupabaseServerClient,
  input: { salonId: string; entity: string; entityId: string; action: string; diff?: Json }
) {
  const { error } = await supabase.rpc("log_audit_event", {
    p_salon_id: input.salonId,
    p_entity: input.entity,
    p_entity_id: input.entityId,
    p_action: input.action,
    p_diff: input.diff,
  });
  if (error) throw error;
}
