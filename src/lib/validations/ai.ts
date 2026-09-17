import { z } from "zod";

// Tipo exacto de CLAUDE.md sección 9. Se valida la salida del modelo antes
// de confiar en ella: un JSON malformado o con enums fuera de rango se
// trata como fallo del proveedor (degradación elegante), nunca se muestra
// tal cual al usuario.
export const recommendationSchema = z.object({
  title: z.string().trim().min(1),
  area: z.enum(["ventas", "clientes", "inventario", "personal", "precios"]),
  impact: z.enum(["alto", "medio", "bajo"]),
  reasoning: z.string().trim().min(1),
  action: z.string().trim().min(1),
});

export const recommendationsResponseSchema = z.array(recommendationSchema).max(10);
