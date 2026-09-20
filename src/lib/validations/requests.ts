import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const requestStatuses = ["pending", "confirmed", "rejected", "cancelled"] as const;

export const requestItemSchema = z.object({
  serviceId: z.string().trim().uuid(),
  staffId: z.string().trim().uuid().optional().or(z.literal("")),
});

export const requestSchema = z.object({
  clientId: z.string().trim().uuid().optional().or(z.literal("")),
  clientName: z.string().trim().min(1).max(120),
  // Opcional (clients.phone ya no es NOT NULL, migración 0018): si falta y la
  // solicitud no queda vinculada a un cliente existente, el cliente se crea
  // con phone = null.
  clientPhone: z.string().trim().max(40).optional().or(z.literal("")),
  clientEmail: z.string().trim().email().max(160).optional().or(z.literal("")),
  preferredDate: z.string().trim().regex(DATE_PATTERN).optional().or(z.literal("")),
  items: z.array(requestItemSchema).min(1),
});

export type RequestInput = z.infer<typeof requestSchema>;
export type RequestItemInput = z.infer<typeof requestItemSchema>;
