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
