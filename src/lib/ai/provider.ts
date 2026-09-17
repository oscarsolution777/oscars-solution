import type { BusinessMetrics } from "./types";

// Recomendación estructurada (CLAUDE.md sección 9, tipo exacto documentado
// ahí). area/impact son enums cerrados: se valida con Zod en
// src/lib/validations/ai.ts antes de confiar en la respuesta del modelo.
export interface Recommendation {
  title: string;
  area: "ventas" | "clientes" | "inventario" | "personal" | "precios";
  impact: "alto" | "medio" | "bajo";
  reasoning: string;
  action: string;
}

// Interfaz de proveedor intercambiable (CLAUDE.md sección 9). `locale` se
// añade a la firma del documento (no está literal ahí) porque el análisis
// y las recomendaciones deben responder "en el idioma activo del usuario".
export interface AiProvider {
  analyzeBusiness(metrics: BusinessMetrics, locale: string): Promise<string>;
  getRecommendations(metrics: BusinessMetrics, locale: string): Promise<Recommendation[]>;
}

// Se lanza cuando falta la API key del proveedor seleccionado por
// AI_PROVIDER. Distinto de un fallo de red/API del proveedor: la Server
// Action lo traduce a un mensaje de "IA no configurada todavía" en vez de
// "no se pudo generar, intenta de nuevo" (degradación elegante, sección 9).
export class AiNotConfiguredError extends Error {
  constructor(providerName: string) {
    super(`Falta la API key para el proveedor de IA "${providerName}".`);
    this.name = "AiNotConfiguredError";
  }
}
