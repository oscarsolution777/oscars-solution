import { z } from "zod";
import { MONEY_INPUT_PATTERN } from "@/lib/utils/money";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const staffPayoutSchema = z
  .object({
    staffId: z.string().trim().uuid(),
    periodStart: z.string().trim().regex(DATE_PATTERN),
    periodEnd: z.string().trim().regex(DATE_PATTERN),
    baseAmount: z.string().trim().regex(MONEY_INPUT_PATTERN),
    bonusAmount: z.string().trim().regex(MONEY_INPUT_PATTERN),
  })
  .refine((data) => data.periodEnd >= data.periodStart, {
    message: "periodEnd must be on or after periodStart",
    path: ["periodEnd"],
  });

export type StaffPayoutInput = z.infer<typeof staffPayoutSchema>;
