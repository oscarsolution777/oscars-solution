import "server-only";
import {
  searchClientsTool,
  getClientDetailTool,
  getAppointmentsForClientTool,
  getTopClientsTool,
} from "./client-tools";
import { listPaymentsTool } from "./payment-tools";
import { getBusinessMetricsTool } from "./metrics-tools";
import type { AiToolContext, AiToolDefinition, AiToolResult } from "./types";

// Set fijo de herramientas expuesto al modelo (CLAUDE.md sección 7.8): el
// modelo nunca puede pedir SQL libre ni una tabla completa, solo llamar a
// una de estas funciones con argumentos de negocio. salonId siempre se
// inyecta desde AiToolContext (sesión del servidor), nunca desde el modelo.
export const AI_TOOLS: AiToolDefinition[] = [
  searchClientsTool,
  getClientDetailTool,
  getAppointmentsForClientTool,
  getTopClientsTool,
  listPaymentsTool,
  getBusinessMetricsTool,
] as AiToolDefinition[];

const toolsByName = new Map(AI_TOOLS.map((t) => [t.name, t]));

// Punto único de ejecución, llamado desde el loop de tool-use de cada
// proveedor (anthropic.ts/openai.ts). Nunca deja que un error de una
// herramienta tumbe la conversación: se lo devuelve al modelo como
// { ok: false, error } para que pueda reformular o avisar al usuario.
export async function executeTool(
  name: string,
  rawArgs: unknown,
  ctx: AiToolContext
): Promise<AiToolResult> {
  const tool = toolsByName.get(name);
  if (!tool) {
    return { ok: false, error: `unknown_tool:${name}` };
  }

  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) {
    return { ok: false, error: "invalid_arguments" };
  }

  try {
    const data = await tool.execute(parsed.data, ctx);
    return { ok: true, data };
  } catch (error) {
    console.error(`[ai-tool:${name}] execution failed`, error);
    const message = error instanceof Error ? error.message : "execution_failed";
    return { ok: false, error: message };
  }
}
