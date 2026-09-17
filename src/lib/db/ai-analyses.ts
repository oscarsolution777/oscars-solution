import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type AiAnalysisRow = Tables<"ai_analyses">;
type AiAnalysisKind = "analysis" | "recommendations";

const SELECT_COLUMNS =
  "id, salon_id, kind, locale, period_from, period_to, result, created_at, updated_at";

export async function getCachedAnalysis(
  supabase: SupabaseServerClient,
  salonId: string,
  kind: AiAnalysisKind,
  locale: string
): Promise<AiAnalysisRow | null> {
  const { data, error } = await supabase
    .from("ai_analyses")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .eq("kind", kind)
    .eq("locale", locale)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Un registro por (salon_id, kind, locale): cada regeneración sobreescribe
// el anterior en vez de acumular historial (ver comentario en la migración
// 0012_ai_analyses_cache.sql).
export async function upsertAnalysisCache(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    kind: AiAnalysisKind;
    locale: string;
    periodFrom: string;
    periodTo: string;
    result: unknown;
  }
): Promise<AiAnalysisRow> {
  const { data, error } = await supabase
    .from("ai_analyses")
    .upsert(
      {
        salon_id: input.salonId,
        kind: input.kind,
        locale: input.locale,
        period_from: input.periodFrom,
        period_to: input.periodTo,
        result: input.result as never,
      },
      { onConflict: "salon_id,kind,locale" }
    )
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
