import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Métricas agregadas por salón (CLAUDE.md sección 7.3: nunca filas
// individuales de clientes/pagos). Ver migración 0010,
// public.platform_usage_summary().
export async function getUsageSummary(supabase: SupabaseServerClient) {
  const { data, error } = await supabase.rpc("platform_usage_summary");
  if (error) throw error;
  return data;
}
