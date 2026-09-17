"use server";

import { createClient } from "@/lib/supabase/server";
import { cancelRequestByCode, requestRescheduleByCode } from "@/lib/db/requests";
import { rescheduleRequestSchema, type RescheduleRequestInput } from "@/lib/validations/public-request";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

// Ambas acciones localizan la solicitud exclusivamente por public_code, vía
// las funciones security definer de la migración 0015 (CLAUDE.md sección
// 7.4) — nunca un UPDATE/INSERT directo de la tabla. Los códigos de error de
// negocio que devuelven esas funciones ("not_found", "already_inactive"...)
// se mapean 1:1 a claves portal.status.errors.<code>.
function mapBusinessError(code: string): string {
  return `portal.status.errors.${code}`;
}

export async function cancelRequestAction(code: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const result = await cancelRequestByCode(supabase, code);
    if (!result.ok) {
      return { ok: false, error: mapBusinessError(result.error) };
    }
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "portal.status.errors.generic" };
  }
}

export async function requestRescheduleAction(
  code: string,
  input: RescheduleRequestInput
): Promise<ActionResult<{ newPublicCode: string }>> {
  const parsed = rescheduleRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "portal.status.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    const result = await requestRescheduleByCode(supabase, code, parsed.data.preferredDate);
    if (!result.ok) {
      return { ok: false, error: mapBusinessError(result.error) };
    }
    return { ok: true, data: { newPublicCode: result.newPublicCode! } };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Demasiadas solicitudes")) {
      return { ok: false, error: "portal.form.errors.rateLimited" };
    }
    return { ok: false, error: "portal.status.errors.generic" };
  }
}
