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

// Turno de texto final del chat libre (Fase 10B) -- nunca incluye las
// llamadas a herramientas intermedias de un turno, solo lo que terminó
// mostrándose. Es lo que se persiste en ai_chat_messages y lo que se le
// vuelve a mandar al modelo como historial en el siguiente mensaje.
export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Firma provider-agnóstica para que cada proveedor ejecute herramientas sin
// que provider.ts conozca Supabase ni el registro de herramientas (ver
// src/lib/ai/tools/). Se construye una vez por turno en la Server Action,
// ya cerrada sobre el salón activo.
export type AiExecuteTool = (
  name: string,
  rawArgs: unknown
) => Promise<{ ok: boolean; data?: unknown; error?: string }>;

export interface AiChatToolDeclaration {
  name: string;
  description: string;
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}

// Interfaz de proveedor intercambiable (CLAUDE.md sección 9). `locale` se
// añade a la firma del documento (no está literal ahí) porque el análisis
// y las recomendaciones deben responder "en el idioma activo del usuario".
export interface AiProvider {
  analyzeBusiness(metrics: BusinessMetrics, locale: string): Promise<string>;
  getRecommendations(metrics: BusinessMetrics, locale: string): Promise<Recommendation[]>;
  // Chat libre con datos reales (Fase 10B, function calling con RPCs
  // acotadas -- CLAUDE.md sección 7.8). Cada proveedor implementa su propio
  // loop de tool-use con el formato de su SDK, pero todos ejecutan las
  // mismas herramientas a través de `executeTool`.
  chat(input: {
    history: AiChatMessage[];
    userMessage: string;
    locale: string;
    salonContext: { salonName: string; currency: string; timezone: string };
    tools: AiChatToolDeclaration[];
    executeTool: AiExecuteTool;
  }): Promise<string>;
  // Asistente de ayuda sobre el funcionamiento del sistema (puntos 3/5 del
  // bloque de ajustes posterior a Fase 10) -- deliberadamente separado de
  // chat(): nunca ve datos de ningún salón, así que no necesita
  // salonContext ni tools/executeTool, solo su propia base de conocimiento
  // estática (prompts/help-system.ts).
  helpChat(input: {
    history: AiChatMessage[];
    userMessage: string;
    locale: string;
  }): Promise<string>;
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
