import { z } from "zod";

// Cantidad de producto consumida por servicio: entero positivo, no dinero
// (por eso no usa MONEY_INPUT_PATTERN).
const QTY_PATTERN = /^\d{1,5}$/;

export const serviceProductSchema = z.object({
  productId: z.string().trim().uuid(),
  qty: z
    .string()
    .trim()
    .regex(QTY_PATTERN)
    .refine((value) => Number.parseInt(value, 10) > 0),
});

export type ServiceProductInput = z.infer<typeof serviceProductSchema>;
