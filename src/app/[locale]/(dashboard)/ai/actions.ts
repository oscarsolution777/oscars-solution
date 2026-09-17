"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import { loadBusinessMetrics } from "@/lib/ai/load-business-metrics";
import { getAiProvider } from "@/lib/ai/get-provider";
import { AiNotConfiguredError } from "@/lib/ai/provider";
import type { Recommendation } from "@/lib/ai/provider";
import { upsertAnalysisCache } from "@/lib/db/ai-analyses";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// CLAUDE.md sección 7: IA es owner ✅, admin ✅, reception ❌ (mismo patrón
// que Reportes, distinto de "todo o nada solo owner" de Finanzas). RLS ya
// lo refuerza con has_role_in_salon(salon_id, ['owner','admin']) en
// ai_analyses; esto es la segunda capa.
async function requireAiAccess() {
  const session = await getCurrentSession();
  const activeMembership = session?.activeMembership;

  if (!session || !activeMembership || !activeMembership.salon) {
    return { ok: false as const, error: "auth.login.noMembership" };
  }
  if (!["owner", "admin"].includes(activeMembership.role)) {
    return { ok: false as const, error: "ai.errors.forbidden" };
  }
  return { ok: true as const, salon: activeMembership.salon };
}

export async function regenerateAnalysisAction(locale: string): Promise<ActionResult<string>> {
  const access = await requireAiAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    const metrics = await loadBusinessMetrics(supabase, access.salon);
    const text = await getAiProvider().analyzeBusiness(metrics, locale);

    await upsertAnalysisCache(supabase, {
      salonId: access.salon.id,
      kind: "analysis",
      locale,
      periodFrom: metrics.periodFrom,
      periodTo: metrics.periodTo,
      result: text,
    });

    return { ok: true, data: text };
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return { ok: false, error: "ai.errors.notConfigured" };
    }
    return { ok: false, error: "ai.errors.providerFailed" };
  }
}

export async function regenerateRecommendationsAction(
  locale: string
): Promise<ActionResult<Recommendation[]>> {
  const access = await requireAiAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    const metrics = await loadBusinessMetrics(supabase, access.salon);
    const recommendations = await getAiProvider().getRecommendations(metrics, locale);

    await upsertAnalysisCache(supabase, {
      salonId: access.salon.id,
      kind: "recommendations",
      locale,
      periodFrom: metrics.periodFrom,
      periodTo: metrics.periodTo,
      result: recommendations,
    });

    return { ok: true, data: recommendations };
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return { ok: false, error: "ai.errors.notConfigured" };
    }
    return { ok: false, error: "ai.errors.providerFailed" };
  }
}
