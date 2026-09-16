import { z } from "zod";
import { MONEY_INPUT_PATTERN } from "@/lib/utils/money";

const STOCK_PATTERN = /^\d{1,6}$/;

export const productUnits = ["ml", "g", "unit"] as const;

export const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  unit: z.enum(productUnits),
  minStock: z.string().trim().regex(STOCK_PATTERN),
  cost: z.string().trim().regex(MONEY_INPUT_PATTERN),
  price: z.string().trim().regex(MONEY_INPUT_PATTERN),
  supplierId: z.string().trim().uuid().optional().or(z.literal("")),
});

export type ProductInput = z.infer<typeof productSchema>;

export function parseStockQty(value: string): number {
  return Number.parseInt(value, 10);
}
