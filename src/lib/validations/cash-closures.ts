import { z } from "zod";
import { MONEY_INPUT_PATTERN } from "@/lib/utils/money";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const cashClosureSchema = z.object({
  closureDate: z.string().trim().regex(DATE_PATTERN),
  openingCash: z.string().trim().regex(MONEY_INPUT_PATTERN),
  countedCash: z.string().trim().regex(MONEY_INPUT_PATTERN),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type CashClosureInput = z.infer<typeof cashClosureSchema>;
