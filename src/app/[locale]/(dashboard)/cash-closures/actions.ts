"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import { cashClosureSchema } from "@/lib/validations/cash-closures";
import { parseMoneyToCents } from "@/lib/utils/money";
import {
  createCashClosureRow,
  updateCashClosureRow,
  previewExpectedCashCents,
} from "@/lib/db/cash-closures";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// CLAUDE.md sección 7: "Pagos / Cuadre de caja" da a los 3 roles
// (owner/admin/reception) lectura Y escritura completa.
async function requireCashClosuresAccess() {
  const session = await getCurrentSession();
  const activeMembership = session?.activeMembership;

  if (!session || !activeMembership) {
    return { ok: false as const, error: "auth.login.noMembership" };
  }

  return {
    ok: true as const,
    salonId: activeMembership.salon!.id,
    userId: session.user.id,
    timezone: activeMembership.salon!.timezone,
  };
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}

export async function previewExpectedCashAction(
  closureDate: string
): Promise<ActionResult<{ expectedCents: number }>> {
  const access = await requireCashClosuresAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    const expectedCents = await previewExpectedCashCents(
      supabase,
      access.salonId,
      closureDate,
      access.timezone
    );
    return { ok: true, data: { expectedCents } };
  } catch {
    return { ok: false, error: "cashClosures.errors.generic" };
  }
}

export async function createCashClosureAction(formData: FormData): Promise<ActionResult> {
  const access = await requireCashClosuresAccess();
  if (!access.ok) return access;

  const parsed = cashClosureSchema.safeParse({
    closureDate: formData.get("closureDate"),
    openingCash: formData.get("openingCash"),
    countedCash: formData.get("countedCash"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "cashClosures.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await createCashClosureRow(supabase, {
      salonId: access.salonId,
      closureDate: parsed.data.closureDate,
      openingCashCents: parseMoneyToCents(parsed.data.openingCash),
      countedCashCents: parseMoneyToCents(parsed.data.countedCash),
      notes: parsed.data.notes || null,
      closedBy: access.userId,
    });
    return { ok: true, data: undefined };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "cashClosures.errors.duplicateDate" };
    }
    return { ok: false, error: "cashClosures.errors.generic" };
  }
}

export async function updateCashClosureAction(formData: FormData): Promise<ActionResult> {
  const access = await requireCashClosuresAccess();
  if (!access.ok) return access;

  const closureId = formData.get("closureId");
  if (typeof closureId !== "string" || closureId.length === 0) {
    return { ok: false, error: "cashClosures.errors.invalidInput" };
  }

  const parsed = cashClosureSchema
    .pick({ countedCash: true, notes: true })
    .safeParse({
      countedCash: formData.get("countedCash"),
      notes: formData.get("notes") ?? "",
    });

  if (!parsed.success) {
    return { ok: false, error: "cashClosures.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await updateCashClosureRow(supabase, closureId, {
      countedCashCents: parseMoneyToCents(parsed.data.countedCash),
      notes: parsed.data.notes || null,
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "cashClosures.errors.generic" };
  }
}
