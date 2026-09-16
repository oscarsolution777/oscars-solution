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
