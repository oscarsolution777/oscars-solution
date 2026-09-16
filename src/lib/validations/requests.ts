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
  // Requerido: si la solicitud no termina vinculada a un cliente existente,
  // se usa para crear el cliente al confirmar (clients.phone es NOT NULL).
  clientPhone: z.string().trim().min(1).max(40),
  clientEmail: z.string().trim().email().max(160).optional().or(z.literal("")),
  preferredDate: z.string().trim().regex(DATE_PATTERN).optional().or(z.literal("")),
  items: z.array(requestItemSchema).min(1),
});

export type RequestInput = z.infer<typeof requestSchema>;
export type RequestItemInput = z.infer<typeof requestItemSchema>;
