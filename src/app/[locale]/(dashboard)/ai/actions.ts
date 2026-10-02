"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import { loadBusinessMetrics } from "@/lib/ai/load-business-metrics";
import { getAiProvider } from "@/lib/ai/get-provider";
import { AiNotConfiguredError } from "@/lib/ai/provider";
import type { Recommendation } from "@/lib/ai/provider";
import { upsertAnalysisCache } from "@/lib/db/ai-analyses";
import { incrementRegenerateUsage } from "@/lib/db/ai-regenerate-usage";
import { listChatMessages, insertChatMessage } from "@/lib/db/ai-chat";
import { AI_TOOLS, executeTool } from "@/lib/ai/tools/registry";
import { chatMessageSchema } from "@/lib/validations/ai";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// "Regenerar" dispara análisis + recomendaciones juntos como una sola acción
// de usuario -- 3 veces por día es el límite que se le puso a ESA acción
// (CLAUDE.md sección 9), no a la carga automática de /ai cuando el caché de
// 24h ya venció (esa sigue llamando al proveedor directo desde page.tsx, sin
// pasar por este contador).
const MAX_REGENERATE_PER_DAY = 3;

// Mismo límite que el trigger check_ai_chat_rate_limit (migración 0024) --
// repetido aquí solo para el mensaje de error, el límite real lo aplica la
// base de datos.
const CHAT_RATE_LIMIT_MESSAGE = "Demasiados mensajes de chat recientes para este salón";

// CLAUDE.md sección 7: IA es owner ✅, admin ✅, reception ❌ (mismo patrón
// que Reportes, distinto de "todo o nada solo owner" de Finanzas). RLS ya
// lo refuerza con has_role_in_salon(salon_id, ['owner','admin']) en
// ai_analyses/ai_chat_messages; esto es la segunda capa.
async function requireAiAccess() {
  const session = await getCurrentSession();
  const activeMembership = session?.activeMembership;

  if (!session || !activeMembership || !activeMembership.salon) {
    return { ok: false as const, error: "auth.login.noMembership" };
  }
  if (!["owner", "admin"].includes(activeMembership.role)) {
    return { ok: false as const, error: "ai.errors.forbidden" };
  }
  return { ok: true as const, session, salon: activeMembership.salon };
}

// Reemplaza a las antiguas regenerateAnalysisAction/regenerateRecommendationsAction
// (fusionadas para que el límite de 3/día cuente un solo uso por clic, no
// uno por cada una de las dos llamadas que ya disparaba el botón).
export async function regenerateAllAction(
  locale: string
): Promise<ActionResult<{ analysisText: string; recommendations: Recommendation[] }>> {
  const access = await requireAiAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();

    const usage = await incrementRegenerateUsage(supabase, access.salon.id, MAX_REGENERATE_PER_DAY);
    if (!usage.ok) {
      return {
        ok: false,
        error:
          usage.error === "limit_reached"
            ? "ai.errors.regenerateLimitReached"
            : "ai.errors.forbidden",
      };
    }

    const metrics = await loadBusinessMetrics(supabase, access.salon);
    const provider = getAiProvider();
    const [analysisText, recommendations] = await Promise.all([
      provider.analyzeBusiness(metrics, locale),
      provider.getRecommendations(metrics, locale),
    ]);

    await Promise.all([
      upsertAnalysisCache(supabase, {
        salonId: access.salon.id,
        kind: "analysis",
        locale,
        periodFrom: metrics.periodFrom,
        periodTo: metrics.periodTo,
        result: analysisText,
      }),
      upsertAnalysisCache(supabase, {
        salonId: access.salon.id,
        kind: "recommendations",
        locale,
        periodFrom: metrics.periodFrom,
        periodTo: metrics.periodTo,
        result: recommendations,
      }),
    ]);

    return { ok: true, data: { analysisText, recommendations } };
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return { ok: false, error: "ai.errors.notConfigured" };
    }
    return { ok: false, error: "ai.errors.providerFailed" };
  }
}

// Chat libre con datos reales (Fase 10B, function calling con RPCs acotadas
// -- CLAUDE.md sección 7.8). El límite de 20 mensajes/hora lo aplica el
// trigger check_ai_chat_rate_limit sobre el INSERT del mensaje del usuario,
// que se hace antes de llamar al proveedor -- si el límite ya se alcanzó, no
// se gasta una llamada real a la API.
export async function sendChatMessageAction(
  rawMessage: string,
  locale: string
): Promise<ActionResult<string>> {
  const access = await requireAiAccess();
  if (!access.ok) return access;

  const parsed = chatMessageSchema.safeParse(rawMessage);
  if (!parsed.success) {
    return { ok: false, error: "ai.chat.errors.invalidInput" };
  }
  const message = parsed.data;

  try {
    const supabase = await createClient();
    const history = await listChatMessages(supabase, access.salon.id);

    try {
      await insertChatMessage(supabase, {
        salonId: access.salon.id,
        userId: access.session.user.id,
        role: "user",
        content: message,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes(CHAT_RATE_LIMIT_MESSAGE)) {
        return { ok: false, error: "ai.chat.errors.rateLimited" };
      }
      throw error;
    }

    const tools = AI_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
    const toolContext = {
      supabase,
      salonId: access.salon.id,
      currency: access.salon.currency,
      timezone: access.salon.timezone,
    };

    const provider = getAiProvider();
    const replyText = await provider.chat({
      history: history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
      userMessage: message,
      locale,
      salonContext: {
        salonName: access.salon.name,
        currency: access.salon.currency,
        timezone: access.salon.timezone,
      },
      tools,
      executeTool: (name, rawArgs) => executeTool(name, rawArgs, toolContext),
    });

    await insertChatMessage(supabase, {
      salonId: access.salon.id,
      userId: access.session.user.id,
      role: "assistant",
      content: replyText,
    });

    return { ok: true, data: replyText };
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return { ok: false, error: "ai.errors.notConfigured" };
    }
    return { ok: false, error: "ai.errors.providerFailed" };
  }
}

// Asistente de ayuda sobre el funcionamiento del sistema (puntos 3/5 del
// bloque de ajustes posterior a Fase 10) -- a diferencia del chat de datos
// de arriba, nunca toca Supabase más allá del guard de acceso: no hay
// salonContext, tools ni persistencia en ai_chat_messages (cero dato
// personal en juego, así que no aplica el mismo límite de 20 msj/hora que
// protege ese chat). El historial vive solo en el estado del cliente
// (HelpChat), nunca se recarga desde el servidor.
export async function sendHelpChatMessageAction(
  rawMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
  locale: string
): Promise<ActionResult<string>> {
  const access = await requireAiAccess();
  if (!access.ok) return access;

  const parsed = chatMessageSchema.safeParse(rawMessage);
  if (!parsed.success) {
    return { ok: false, error: "ai.chat.errors.invalidInput" };
  }

  try {
    const provider = getAiProvider();
    const replyText = await provider.helpChat({
      history,
      userMessage: parsed.data,
      locale,
    });
    return { ok: true, data: replyText };
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return { ok: false, error: "ai.errors.notConfigured" };
    }
    return { ok: false, error: "ai.errors.providerFailed" };
  }
}
