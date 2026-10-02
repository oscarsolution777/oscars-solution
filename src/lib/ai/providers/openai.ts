import "server-only";
import OpenAI from "openai";
import type { AiProvider, Recommendation } from "../provider";
import type { BusinessMetrics } from "../types";
import { buildAnalyzeBusinessPrompt } from "../prompts/analyze-business";
import { buildRecommendationsPrompt } from "../prompts/recommendations";
import { buildChatSystemPrompt } from "../prompts/chat-system";
import { buildHelpSystemPrompt } from "../prompts/help-system";
import { parseJsonArray } from "../parse-json";
import { recommendationsResponseSchema } from "@/lib/validations/ai";

const DEFAULT_MODEL = "gpt-4o-mini";

// Mismo tope que el proveedor de Anthropic (CLAUDE.md sección 9): protege
// contra un loop del modelo llamando herramientas sin converger, y acota el
// costo máximo de un solo mensaje del chat.
const MAX_TOOL_ITERATIONS = 6;

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const openaiProvider: AiProvider = {
  async analyzeBusiness(metrics: BusinessMetrics, locale: string): Promise<string> {
    const completion = await getClient().chat.completions.create({
      model: process.env.AI_MODEL ?? DEFAULT_MODEL,
      messages: [{ role: "user", content: buildAnalyzeBusinessPrompt(metrics, locale) }],
    });
    return (completion.choices[0]?.message?.content ?? "").trim();
  },

  async getRecommendations(metrics: BusinessMetrics, locale: string): Promise<Recommendation[]> {
    const completion = await getClient().chat.completions.create({
      model: process.env.AI_MODEL ?? DEFAULT_MODEL,
      messages: [{ role: "user", content: buildRecommendationsPrompt(metrics, locale) }],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const parsed = recommendationsResponseSchema.safeParse(parseJsonArray(text));
    if (!parsed.success) {
      throw new Error("Respuesta de IA con formato inválido");
    }
    return parsed.data;
  },

  async chat({ history, userMessage, locale, salonContext, tools, executeTool }) {
    const client = getClient();
    const model = process.env.AI_MODEL ?? DEFAULT_MODEL;
    const system = buildChatSystemPrompt(salonContext, locale);

    const openaiTools: OpenAI.Chat.ChatCompletionTool[] = tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: tool.inputSchema.properties,
          required: tool.inputSchema.required ?? [],
        },
      },
    }));

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      ...history.map(
        (m): OpenAI.Chat.ChatCompletionMessageParam => ({ role: m.role, content: m.content })
      ),
      { role: "user", content: userMessage },
    ];

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const completion = await client.chat.completions.create({
        model,
        messages,
        tools: openaiTools,
      });

      const message = completion.choices[0]?.message;
      const toolCalls = (message?.tool_calls ?? []).filter(
        (call): call is OpenAI.Chat.ChatCompletionMessageFunctionToolCall => call.type === "function"
      );

      if (toolCalls.length === 0) {
        return (message?.content ?? "").trim();
      }

      messages.push({ role: "assistant", content: message?.content ?? null, tool_calls: toolCalls });

      for (const call of toolCalls) {
        let rawArgs: unknown = {};
        try {
          rawArgs = JSON.parse(call.function.arguments);
        } catch {
          rawArgs = {};
        }
        const result = await executeTool(call.function.name, rawArgs);
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
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

  async helpChat({ history, userMessage, locale }) {
    const completion = await getClient().chat.completions.create({
      model: process.env.AI_MODEL ?? DEFAULT_MODEL,
      messages: [
        { role: "system", content: buildHelpSystemPrompt(locale) },
        ...history.map(
          (m): OpenAI.Chat.ChatCompletionMessageParam => ({ role: m.role, content: m.content })
        ),
        { role: "user", content: userMessage },
      ],
    });
    return (completion.choices[0]?.message?.content ?? "").trim();
  },
};
