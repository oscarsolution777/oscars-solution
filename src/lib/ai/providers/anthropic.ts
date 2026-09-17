import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, Recommendation } from "../provider";
import type { BusinessMetrics } from "../types";
import { buildAnalyzeBusinessPrompt } from "../prompts/analyze-business";
import { buildRecommendationsPrompt } from "../prompts/recommendations";
import { parseJsonArray } from "../parse-json";
import { recommendationsResponseSchema } from "@/lib/validations/ai";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

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
};
