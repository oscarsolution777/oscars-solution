import { z } from "zod";

const QTY_PATTERN = /^\d{1,6}$/;

export const stockMovementTypes = ["in", "out", "adjustment", "loss"] as const;
export const stockMovementDirections = ["increase", "decrease"] as const;

// "qty" siempre se captura como magnitud positiva en el formulario. Para
// "adjustment" (única dirección ambigua) se añade "direction" para decidir
// el signo; "in"/"out"/"loss" ya tienen dirección implícita por el tipo,
// igual que exige el check constraint de stock_movements en la migración.
export const stockMovementSchema = z
  .object({
    productId: z.string().trim().uuid(),
    type: z.enum(stockMovementTypes),
    qty: z.string().trim().regex(QTY_PATTERN),
    direction: z.enum(stockMovementDirections).optional(),
    reason: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((data) => data.type !== "adjustment" || data.direction !== undefined, {
    message: "direction is required for adjustment",
    path: ["direction"],
  });

export type StockMovementInput = z.infer<typeof stockMovementSchema>;

export function computeSignedQty(
  type: (typeof stockMovementTypes)[number],
  qty: string,
  direction: (typeof stockMovementDirections)[number] | undefined
): number {
  const magnitude = Number.parseInt(qty, 10);
  if (type === "adjustment") {
    return direction === "decrease" ? -magnitude : magnitude;
  }
  return magnitude;
}
