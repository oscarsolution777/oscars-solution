import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// "Regenerar" en /ai dispara análisis + recomendaciones juntos como una sola
// acción de usuario (regenerateAllAction) -- por eso el límite es un único
// contador por salón, no uno por kind. La función SQL hace el chequeo y el
// incremento de forma atómica (CLAUDE.md sección 9: 3 veces por día).
export async function incrementRegenerateUsage(
  supabase: SupabaseServerClient,
  salonId: string,
  max: number
): Promise<{ ok: true; remaining: number } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("increment_ai_regenerate_usage", {
    p_salon_id: salonId,
    p_max: max,
  });
  if (error) throw error;

  const result = data as { ok: boolean; error?: string; remaining?: number };
  if (!result.ok) {
    return { ok: false, error: result.error ?? "forbidden" };
  }
  return { ok: true, remaining: result.remaining ?? 0 };
}
