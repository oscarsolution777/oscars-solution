"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import { paymentSchema, paymentStatuses } from "@/lib/validations/payments";
import { parseMoneyToCents } from "@/lib/utils/money";
import { createPaymentRow, updatePaymentRow } from "@/lib/db/payments";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// CLAUDE.md sección 7: "Pagos / Cuadre de caja" da a los 3 roles
// (owner/admin/reception) lectura Y escritura completa — igual que
// "Clientes"/"Inventario", sin has_role_in_salon.
async function requirePaymentsAccess() {
  const session = await getCurrentSession();
  const activeMembership = session?.activeMembership;

  if (!session || !activeMembership) {
    return { ok: false as const, error: "auth.login.noMembership" };
  }

  return { ok: true as const, salonId: activeMembership.salon!.id };
}

export async function createPaymentAction(formData: FormData): Promise<ActionResult> {
  const access = await requirePaymentsAccess();
  if (!access.ok) return access;

  const parsed = paymentSchema.safeParse({
    clientId: formData.get("clientId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    status: formData.get("status"),
    reference: formData.get("reference") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "payments.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await createPaymentRow(supabase, {
      salonId: access.salonId,
      clientId: parsed.data.clientId,
      amountCents: parseMoneyToCents(parsed.data.amount),
      method: parsed.data.method,
      status: parsed.data.status,
      reference: parsed.data.reference || null,
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "payments.errors.generic" };
  }
}

export async function updatePaymentAction(formData: FormData): Promise<ActionResult> {
  const access = await requirePaymentsAccess();
  if (!access.ok) return access;

  const paymentId = formData.get("paymentId");
  if (typeof paymentId !== "string" || paymentId.length === 0) {
    return { ok: false, error: "payments.errors.invalidInput" };
  }

  const parsed = paymentSchema.safeParse({
    clientId: formData.get("clientId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    status: formData.get("status"),
    reference: formData.get("reference") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "payments.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await updatePaymentRow(supabase, paymentId, {
      amountCents: parseMoneyToCents(parsed.data.amount),
      method: parsed.data.method,
      status: parsed.data.status,
      reference: parsed.data.reference || null,
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "payments.errors.generic" };
  }
}

export async function setPaymentStatusAction(
  paymentId: string,
  status: string
): Promise<ActionResult> {
  const access = await requirePaymentsAccess();
  if (!access.ok) return access;

  if (!paymentStatuses.includes(status as (typeof paymentStatuses)[number])) {
    return { ok: false, error: "payments.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await updatePaymentRow(supabase, paymentId, { status });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "payments.errors.generic" };
  }
}
