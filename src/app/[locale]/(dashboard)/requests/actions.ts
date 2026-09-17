"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import { requestSchema, requestStatuses } from "@/lib/validations/requests";
import { confirmRequestSchema, appointmentStatuses } from "@/lib/validations/appointments";
import { createRequestWithItems, getRequestById, updateRequestRow } from "@/lib/db/requests";
import { createAppointmentFromRequest, updateAppointmentRow } from "@/lib/db/appointments";
import { createClientRow } from "@/lib/db/clients";
import { logAuditEvent } from "@/lib/db/audit-log";
import type { RequestInput } from "@/lib/validations/requests";
import type { ConfirmRequestInput } from "@/lib/validations/appointments";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

// CLAUDE.md sección 7: "Solicitudes / Citas" da a los 3 roles
// (owner/admin/reception) lectura y escritura completa — igual que
// "Pagos"/"Clientes"/"Inventario", sin has_role_in_salon.
async function requireRequestsAccess() {
  const session = await getCurrentSession();
  const activeMembership = session?.activeMembership;

  if (!session || !activeMembership) {
    return { ok: false as const, error: "auth.login.noMembership" };
  }

  return { ok: true as const, salonId: activeMembership.salon!.id, userId: session.user.id };
}

// Los items llegan como objeto (no FormData): son una lista dinámica de
// longitud variable, mismo patrón ya usado para arreglos en esta app
// (updateStaffServicesAction recibe un array directamente, Fase 5).
export async function createRequestAction(input: RequestInput): Promise<ActionResult> {
  const access = await requireRequestsAccess();
  if (!access.ok) return access;

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "requests.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await createRequestWithItems(supabase, {
      salonId: access.salonId,
      clientId: parsed.data.clientId || null,
      clientName: parsed.data.clientName,
      clientPhone: parsed.data.clientPhone,
      clientEmail: parsed.data.clientEmail || null,
      preferredDate: parsed.data.preferredDate || null,
      items: parsed.data.items.map((item) => ({
        serviceId: item.serviceId,
        staffId: item.staffId || null,
      })),
      source: "manual",
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "requests.errors.generic" };
  }
}

export async function setRequestStatusAction(
  requestId: string,
  status: string
): Promise<ActionResult> {
  const access = await requireRequestsAccess();
  if (!access.ok) return access;

  if (!requestStatuses.includes(status as (typeof requestStatuses)[number])) {
    return { ok: false, error: "requests.errors.invalidInput" };
  }
  if (status === "confirmed") {
    // La confirmación crea la cita: pasa siempre por confirmRequestAction.
    return { ok: false, error: "requests.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await updateRequestRow(supabase, requestId, { status });

    // Auditoría (Fase 10, alcance acotado): solo rechazar, no cualquier
    // transición de estado de una solicitud.
    if (status === "rejected") {
      try {
        await logAuditEvent(supabase, {
          salonId: access.salonId,
          entity: "request",
          entityId: requestId,
          action: "request_rejected",
        });
      } catch {
        // Best-effort: la solicitud ya quedó rechazada, no se revierte por
        // un fallo al registrar la auditoría.
      }
    }

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "requests.errors.generic" };
  }
}

// Confirma una solicitud: crea la cita + sus items, y vincula o crea el
// cliente (CLAUDE.md flujo 2: "se crea la CITA y se vincula o crea el
// CLIENTE"). Si la solicitud ya tenía client_id, se reutiliza sin pedirlo.
export async function confirmRequestAction(
  requestId: string,
  input: ConfirmRequestInput
): Promise<ActionResult> {
  const access = await requireRequestsAccess();
  if (!access.ok) return access;

  const parsed = confirmRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "requests.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    const request = await getRequestById(supabase, requestId);

    let clientId = parsed.data.clientId || request.client_id;
    if (!clientId) {
      const newClient = await createClientRow(supabase, {
        salonId: access.salonId,
        fullName: request.client_name,
        phone: request.client_phone || "—",
        email: request.client_email,
        notes: null,
        preferences: [],
      });
      clientId = newClient.id;
    }

    await createAppointmentFromRequest(supabase, {
      salonId: access.salonId,
      requestId,
      clientId,
      appointmentDate: parsed.data.appointmentDate,
      items: parsed.data.items.map((item) => ({
        serviceId: item.serviceId,
        staffId: item.staffId,
      })),
    });

    try {
      await logAuditEvent(supabase, {
        salonId: access.salonId,
        entity: "request",
        entityId: requestId,
        action: "request_confirmed",
      });
    } catch {
      // Best-effort: la cita ya quedó creada, no se revierte por un fallo
      // al registrar la auditoría.
    }

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "requests.errors.generic" };
  }
}

export async function setAppointmentStatusAction(
  appointmentId: string,
  status: string
): Promise<ActionResult> {
  const access = await requireRequestsAccess();
  if (!access.ok) return access;

  if (!appointmentStatuses.includes(status as (typeof appointmentStatuses)[number])) {
    return { ok: false, error: "requests.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await updateAppointmentRow(supabase, appointmentId, { status });

    // Auditoría (Fase 10, alcance acotado): solo cancelar, no cualquier
    // transición de estado de una cita (completed/no_show quedan fuera).
    if (status === "cancelled") {
      try {
        await logAuditEvent(supabase, {
          salonId: access.salonId,
          entity: "appointment",
          entityId: appointmentId,
          action: "appointment_cancelled",
        });
      } catch {
        // Best-effort: la cita ya quedó cancelada, no se revierte por un
        // fallo al registrar la auditoría.
      }
    }

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "requests.errors.generic" };
  }
}

export async function rescheduleAppointmentAction(
  appointmentId: string,
  appointmentDate: string
): Promise<ActionResult> {
  const access = await requireRequestsAccess();
  if (!access.ok) return access;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
    return { ok: false, error: "requests.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await updateAppointmentRow(supabase, appointmentId, { appointmentDate });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "requests.errors.generic" };
  }
}
