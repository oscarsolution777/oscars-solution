import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Métricas agregadas por salón (CLAUDE.md sección 7.3: nunca filas
// individuales de clientes/pagos). Ver migraciones 0010/0021,
// public.platform_usage_summary(). from/to son timestamptz en ISO (UTC,
// inclusive) o null para no acotar ese extremo — null en ambos replica el
// comportamiento anterior (totales acumulados de siempre).
export async function getUsageSummary(
  supabase: SupabaseServerClient,
  range?: { from: string | null; to: string | null }
) {
  const { data, error } = await supabase.rpc("platform_usage_summary", {
    p_from: range?.from ?? undefined,
    p_to: range?.to ?? undefined,
  });
  if (error) throw error;
  return data;
}
