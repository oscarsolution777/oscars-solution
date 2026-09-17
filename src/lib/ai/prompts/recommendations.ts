import type { BusinessMetrics } from "../types";
import { LOCALE_NAMES, formatMetricsBlock } from "./format-metrics";

export function buildRecommendationsPrompt(metrics: BusinessMetrics, locale: string): string {
  const languageName = LOCALE_NAMES[locale] ?? "español";

  return `Eres un asesor de negocio para salones de belleza. A continuación tienes las métricas agregadas y reales de un salón. Son las únicas cifras disponibles: no inventes datos, nombres de clientes ni cifras que no aparezcan aquí.

${formatMetricsBlock(metrics)}

Genera hasta 5 recomendaciones concretas y accionables para mejorar el negocio, basadas únicamente en las métricas de arriba. Responde ÚNICAMENTE con un array JSON válido (sin texto adicional, sin bloques de código Markdown), donde cada elemento tenga exactamente esta forma:
{"title": string, "area": "ventas"|"clientes"|"inventario"|"personal"|"precios", "impact": "alto"|"medio"|"bajo", "reasoning": string, "action": string}
Todos los textos (title, reasoning, action) deben estar en ${languageName}. No inventes datos que no estén en las métricas.`;
}
