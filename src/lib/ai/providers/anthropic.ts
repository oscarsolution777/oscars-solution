import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, Recommendation } from "../provider";
import type { BusinessMetrics } from "../types";
import { buildAnalyzeBusinessPrompt } from "../prompts/analyze-business";
import { buildRecommendationsPrompt } from "../prompts/recommendations";
import { buildChatSystemPrompt } from "../prompts/chat-system";
import { parseJsonArray } from "../parse-json";
import { recommendationsResponseSchema } from "@/lib/validations/ai";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

// Tope de idas y vueltas de herramientas por turno (CLAUDE.md sección 9):
// protege contra un loop del modelo llamando herramientas sin converger a
// una respuesta, y acota el costo máximo de un solo mensaje del chat.
const MAX_TOOL_ITERATIONS = 6;

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export const anthropicProvider: AiProvider = {
  async analyzeBusiness(metrics: BusinessMetrics, locale: string): Promise<string> {
    const message = await getClient().messages.create({
      model: process.env.AI_MODEL ?? DEFAULT_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: buildAnalyzeBusinessPrompt(metrics, locale) }],
    });
    return extractText(message);
  },

  async getRecommendations(metrics: BusinessMetrics, locale: string): Promise<Recommendation[]> {
    const message = await getClient().messages.create({
      model: process.env.AI_MODEL ?? DEFAULT_MODEL,
      max_tokens: 1536,
      messages: [{ role: "user", content: buildRecommendationsPrompt(metrics, locale) }],
    });

    const parsed = recommendationsResponseSchema.safeParse(parseJsonArray(extractText(message)));
    if (!parsed.success) {
      throw new Error("Respuesta de IA con formato inválido");
    }
    return parsed.data;
  },

  async chat({ history, userMessage, locale, salonContext, tools, executeTool }) {
    const client = getClient();
    const system = buildChatSystemPrompt(salonContext, locale);
    const model = process.env.AI_MODEL ?? DEFAULT_MODEL;

    const anthropicTools: Anthropic.Tool[] = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: "object",
        properties: tool.inputSchema.properties,
        required: tool.inputSchema.required ?? null,
      },
    }));

    const messages: Anthropic.MessageParam[] = [
      ...history.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system,
        messages,
        tools: anthropicTools,
      });

      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (toolUses.length === 0) {
        return extractText(response);
      }

      // Se reconstruye el turno del asistente solo con los bloques que
      // importan para el loop (texto + tool_use) -- nunca se reenvía
      // response.content tal cual, para no depender de que cada variante de
      // ContentBlock de salida sea estructuralmente idéntica a su Param de
      // entrada.
      const assistantContent: Anthropic.ContentBlockParam[] = response.content
        .map((block): Anthropic.ContentBlockParam | null => {
          if (block.type === "text") return { type: "text", text: block.text };
          if (block.type === "tool_use") {
            return { type: "tool_use", id: block.id, name: block.name, input: block.input };
          }
          return null;
        })
        .filter((block): block is Anthropic.ContentBlockParam => block !== null);
      messages.push({ role: "assistant", content: assistantContent });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        const result = await executeTool(toolUse.name, toolUse.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    const languageFallback: Record<string, string> = {
      es: "No pude terminar de procesar tu consulta. Intenta reformularla.",
      en: "I couldn't finish processing your question. Try rephrasing it.",
      pt: "Não consegui terminar de processar sua pergunta. Tente reformulá-la.",
      it: "Non sono riuscito a completare la tua richiesta. Prova a riformularla.",
      fr: "Je n'ai pas pu terminer de traiter votre question. Essayez de la reformuler.",
      de: "Ich konnte deine Frage nicht vollständig bearbeiten. Versuche es umformuliert.",
    };
    return languageFallback[locale] ?? languageFallback.es;
  },
};
