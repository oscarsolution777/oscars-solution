import { z } from "zod";
import { MONEY_INPUT_PATTERN } from "@/lib/utils/money";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const staffSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  roleTitle: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  baseSalary: z.string().trim().regex(MONEY_INPUT_PATTERN),
  hiredAt: z.string().trim().regex(DATE_PATTERN),
});

export type StaffInput = z.infer<typeof staffSchema>;
