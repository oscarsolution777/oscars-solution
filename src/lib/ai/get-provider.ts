import "server-only";
import type { AiProvider } from "./provider";
import { AiNotConfiguredError } from "./provider";
import { anthropicProvider } from "./providers/anthropic";
import { openaiProvider } from "./providers/openai";

// Selección por AI_PROVIDER (CLAUDE.md sección 9). Si falta la API key
// requerida por el proveedor elegido, lanza AiNotConfiguredError en vez de
// dejar que el SDK falle con un error críptico más adelante — hoy mismo
// (ANTHROPIC_API_KEY/OPENAI_API_KEY vacías en .env.local) este es el
// camino que se ejecuta en cada carga de /ai.
export function getAiProvider(): AiProvider {
  const providerName = process.env.AI_PROVIDER ?? "anthropic";

  if (providerName === "openai") {
    if (!process.env.OPENAI_API_KEY) throw new AiNotConfiguredError("openai");
    return openaiProvider;
  }

  if (!process.env.ANTHROPIC_API_KEY) throw new AiNotConfiguredError("anthropic");
  return anthropicProvider;
}
