import type { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Contexto que cada herramienta recibe del servidor -- NUNCA del modelo.
// salonId es lo que hace que "function calling con RPCs acotadas" sea seguro
// (CLAUDE.md sección 7.8): el modelo elige QUÉ herramienta llamar y con qué
// argumentos de negocio (un nombre a buscar, un id de cliente...), pero
// jamás decide de qué salón lee.
export interface AiToolContext {
  supabase: SupabaseServerClient;
  salonId: string;
  currency: string;
  timezone: string;
}

// input_schema (Anthropic) y parameters (OpenAI) son ambos JSON Schema
// plano -- se declara una vez por herramienta y cada proveedor lo usa tal
// cual, sin traducción.
export type AiToolJsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
};

export interface AiToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  inputSchema: AiToolJsonSchema;
  // Valida los argumentos crudos que manda el modelo antes de ejecutar nada.
  schema: z.ZodType<TInput>;
  execute: (args: TInput, ctx: AiToolContext) => Promise<unknown>;
}

export type AiToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };
