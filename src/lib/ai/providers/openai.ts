import "server-only";
import OpenAI from "openai";
import type { AiProvider, Recommendation } from "../provider";
import type { BusinessMetrics } from "../types";
import { buildAnalyzeBusinessPrompt } from "../prompts/analyze-business";
import { buildRecommendationsPrompt } from "../prompts/recommendations";
import { parseJsonArray } from "../parse-json";
import { recommendationsResponseSchema } from "@/lib/validations/ai";

const DEFAULT_MODEL = "gpt-4o-mini";

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
};
