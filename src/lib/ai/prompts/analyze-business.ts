import type { BusinessMetrics } from "../types";
import { LOCALE_NAMES, formatMetricsBlock } from "./format-metrics";

export function buildAnalyzeBusinessPrompt(metrics: BusinessMetrics, locale: string): string {
  const languageName = LOCALE_NAMES[locale] ?? "español";

  return `Eres un asesor de negocio para salones de belleza. A continuación tienes las métricas agregadas y reales de un salón. Son las únicas cifras disponibles: no inventes datos, nombres de clientes ni cifras que no aparezcan aquí.

${formatMetricsBlock(metrics)}

Escribe un diagnóstico breve (entre 3 y 5 párrafos cortos) del estado del negocio en este periodo, en un tono cercano y profesional, dirigido a la dueña del salón. Responde completamente en ${languageName}. No uses formato Markdown ni encabezados, solo texto corrido.`;
}
