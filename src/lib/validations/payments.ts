import { z } from "zod";
import { MONEY_INPUT_PATTERN } from "@/lib/utils/money";

export const paymentMethods = ["cash", "card", "transfer", "other"] as const;
export const paymentStatuses = ["pending", "paid", "refunded"] as const;

export const paymentSchema = z.object({
  clientId: z.string().trim().uuid(),
  amount: z.string().trim().regex(MONEY_INPUT_PATTERN),
  method: z.enum(paymentMethods),
  status: z.enum(paymentStatuses),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
