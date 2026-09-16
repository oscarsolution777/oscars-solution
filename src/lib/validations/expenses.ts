import { z } from "zod";
import { MONEY_INPUT_PATTERN } from "@/lib/utils/money";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const expenseSchema = z.object({
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  amount: z.string().trim().regex(MONEY_INPUT_PATTERN),
  spentAt: z.string().trim().regex(DATE_PATTERN),
  supplierId: z.string().trim().uuid().optional().or(z.literal("")),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
