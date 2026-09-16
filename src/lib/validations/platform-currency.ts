import { z } from "zod";
import { MONEY_INPUT_PATTERN } from "@/lib/utils/money";

export const createCurrencySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
  name: z.string().trim().min(1).max(80),
  symbol: z.string().trim().min(1).max(8),
});
export type CreateCurrencyInput = z.infer<typeof createCurrencySchema>;

export const subscriptionPriceSchema = z.object({
  currencyCode: z.string().trim().length(3),
  price: z.string().trim().regex(MONEY_INPUT_PATTERN),
});
export type SubscriptionPriceInput = z.infer<typeof subscriptionPriceSchema>;
