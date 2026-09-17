import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { loadBusinessMetrics } from "@/lib/ai/load-business-metrics";
import { getCachedAnalysis, upsertAnalysisCache } from "@/lib/db/ai-analyses";
import { getAiProvider } from "@/lib/ai/get-provider";
import { AiNotConfiguredError } from "@/lib/ai/provider";
import type { Recommendation } from "@/lib/ai/provider";
import { AiView } from "./_components/ai-view";

const ALLOWED_ROLES = ["owner", "admin"];
const CACHE_FRESH_MS = 24 * 60 * 60 * 1000;

export default async function AiPage() {
  const session = await requireAuth();
  const locale = await getLocale();
  const salon = session.activeMembership?.salon;

  if (!salon || !session.activeMembership) {
    const t = await getTranslations("dashboard");
    const tAuth = await getTranslations("auth.login");
    return <EmptyState title={t("welcomeTitle")} description={tAuth("noMembership")} />;
  }

  if (!ALLOWED_ROLES.includes(session.activeMembership.role)) {
    const t = await getTranslations("ai");
    return <EmptyState title={t("errors.forbiddenTitle")} description={t("errors.forbidden")} />;
  }

  const supabase = await createClient();

  const [cachedAnalysis, cachedRecommendations] = await Promise.all([
    getCachedAnalysis(supabase, salon.id, "analysis", locale),
    getCachedAnalysis(supabase, salon.id, "recommendations", locale),
  ]);

  const now = new Date().getTime();
  const analysisIsFresh =
    !!cachedAnalysis && now - new Date(cachedAnalysis.created_at).getTime() < CACHE_FRESH_MS;
  const recommendationsAreFresh =
    !!cachedRecommendations &&
    now - new Date(cachedRecommendations.created_at).getTime() < CACHE_FRESH_MS;

  let analysisText: string | null = analysisIsFresh ? (cachedAnalysis!.result as string) : null;
  let recommendations: Recommendation[] | null = recommendationsAreFresh
    ? (cachedRecommendations!.result as unknown as Recommendation[])
    : null;
  let notConfigured = false;
  let generationFailed = false;

  // Estado por defecto hoy: sin ANTHROPIC_API_KEY/OPENAI_API_KEY cargadas
  // (.env.local), este bloque siempre cae en AiNotConfiguredError — es el
  // camino de "degradación elegante" de CLAUDE.md sección 9, no un caso de
  // borde. Si algo cacheado (aunque vencido) existe, se muestra igual antes
  // que dejar la página vacía.
  if (!analysisIsFresh || !recommendationsAreFresh) {
    try {
      const metrics = await loadBusinessMetrics(supabase, salon);
      const provider = getAiProvider();

      if (!analysisIsFresh) {
        analysisText = await provider.analyzeBusiness(metrics, locale);
        await upsertAnalysisCache(supabase, {
          salonId: salon.id,
          kind: "analysis",
          locale,
          periodFrom: metrics.periodFrom,
          periodTo: metrics.periodTo,
          result: analysisText,
        });
      }

      if (!recommendationsAreFresh) {
        recommendations = await provider.getRecommendations(metrics, locale);
        await upsertAnalysisCache(supabase, {
          salonId: salon.id,
          kind: "recommendations",
          locale,
          periodFrom: metrics.periodFrom,
          periodTo: metrics.periodTo,
          result: recommendations,
        });
      }
    } catch (error) {
      if (error instanceof AiNotConfiguredError) {
        notConfigured = true;
      } else {
        generationFailed = true;
      }
      if (!analysisText && cachedAnalysis) analysisText = cachedAnalysis.result as string;
      if (!recommendations && cachedRecommendations) {
        recommendations = cachedRecommendations.result as unknown as Recommendation[];
      }
    }
  }

  return (
    <AiView
      analysisText={analysisText}
      recommendations={recommendations}
      notConfigured={notConfigured}
      generationFailed={generationFailed}
      locale={locale}
    />
  );
}
