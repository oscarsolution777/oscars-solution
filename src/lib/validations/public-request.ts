import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const publicRequestItemSchema = z.object({
  serviceId: z.string().trim().uuid(),
  staffId: z.string().trim().uuid().optional().or(z.literal("")),
});

export const publicRequestSchema = z.object({
  clientName: z.string().trim().min(1).max(120),
  clientPhone: z.string().trim().min(1).max(40),
  clientEmail: z.string().trim().email().max(160).optional().or(z.literal("")),
  preferredDate: z.string().trim().regex(DATE_PATTERN).optional().or(z.literal("")),
  items: z.array(publicRequestItemSchema).min(1),
});

export type PublicRequestInput = z.infer<typeof publicRequestSchema>;
export type PublicRequestItemInput = z.infer<typeof publicRequestItemSchema>;

export const rescheduleRequestSchema = z.object({
  preferredDate: z.string().trim().regex(DATE_PATTERN),
});

export type RescheduleRequestInput = z.infer<typeof rescheduleRequestSchema>;
