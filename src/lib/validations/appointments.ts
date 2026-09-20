import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const appointmentStatuses = ["scheduled", "completed", "no_show", "cancelled"] as const;

export const confirmRequestItemSchema = z.object({
  requestItemId: z.string().trim().uuid(),
  serviceId: z.string().trim().uuid(),
  staffId: z.string().trim().uuid(),
});

export const confirmRequestSchema = z.object({
  appointmentDate: z.string().trim().regex(DATE_PATTERN),
  clientId: z.string().trim().uuid().optional().or(z.literal("")),
  items: z.array(confirmRequestItemSchema).min(1),
});

export type ConfirmRequestInput = z.infer<typeof confirmRequestSchema>;

export const rescheduleAppointmentSchema = z.object({
  appointmentDate: z.string().trim().regex(DATE_PATTERN),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

// Creación directa de una cita desde la pestaña "Agenda" (sin pasar por el
// flujo de solicitudes): mismo requisito de negocio que confirmar una
// solicitud (staff_id es obligatorio en appointment_items, migración 0008),
// pero el cliente puede ser nuevo (mismo patrón que requestSchema).
export const createAppointmentItemSchema = z.object({
  serviceId: z.string().trim().uuid(),
  staffId: z.string().trim().uuid(),
});

export const createAppointmentSchema = z.object({
  clientId: z.string().trim().uuid().optional().or(z.literal("")),
  clientName: z.string().trim().min(1).max(120),
  clientPhone: z.string().trim().max(40).optional().or(z.literal("")),
  clientEmail: z.string().trim().email().max(160).optional().or(z.literal("")),
  appointmentDate: z.string().trim().regex(DATE_PATTERN),
  items: z.array(createAppointmentItemSchema).min(1),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
