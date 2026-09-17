// Los modelos a veces envuelven el JSON pedido en un bloque ```json a pesar
// de la instrucción explícita de no hacerlo — se tolera aquí en vez de
// fallar de inmediato, antes de la validación real con Zod.
export function parseJsonArray(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}
