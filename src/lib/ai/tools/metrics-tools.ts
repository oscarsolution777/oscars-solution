import "server-only";
import { z } from "zod";
import { loadBusinessMetricsForRange } from "../load-business-metrics";
import type { AiToolContext, AiToolDefinition } from "./types";

const getBusinessMetricsSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Mismos agregados 100% anónimos que ya usan Analizar negocio/Recomendaciones
// (CLAUDE.md sección 9), solo que con un rango de fechas que elige quien
// pregunta en vez del fijo de últimos 30 días -- "¿cómo me fue el mes
// pasado?" no lo puede responder BusinessMetrics fijo.
export const getBusinessMetricsTool: AiToolDefinition<z.infer<typeof getBusinessMetricsSchema>> = {
  name: "get_business_metrics",
  description:
    "Métricas agregadas del negocio (ingresos, citas completadas, tasa de no-show, ticket promedio, servicios más vendidos, carga por trabajador, clientes nuevos/recurrentes, stock bajo, diferencia de caja) para un rango de fechas. Si no se dan fechas, usa los últimos 30 días.",
  inputSchema: {
    type: "object",
    properties: {
      from: { type: "string", description: "Fecha inicial yyyy-MM-dd (opcional)" },
      to: { type: "string", description: "Fecha final yyyy-MM-dd (opcional)" },
    },
  },
  schema: getBusinessMetricsSchema,
  async execute(args, ctx: AiToolContext) {
    const to = args.to ?? new Date().toISOString().slice(0, 10);
    const from = args.from ?? (() => {
      const d = new Date(`${to}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 29);
      return d.toISOString().slice(0, 10);
    })();

    return loadBusinessMetricsForRange(
      ctx.supabase,
      { id: ctx.salonId, currency: ctx.currency },
      from,
      to
    );
  },
};
