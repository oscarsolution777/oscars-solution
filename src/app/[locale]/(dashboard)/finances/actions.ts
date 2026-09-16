"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import { expenseSchema } from "@/lib/validations/expenses";
import { staffPayoutSchema } from "@/lib/validations/staff-payouts";
import { parseMoneyToCents } from "@/lib/utils/money";
import {
  createExpenseRow,
  updateExpenseRow,
  deleteExpenseRow,
} from "@/lib/db/expenses";
import { createStaffPayoutRow, updateStaffPayoutRow } from "@/lib/db/staff-payouts";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// CLAUDE.md sección 7: "Finanzas / Nóminas" es owner ✅, admin ❌, reception ❌
// — a diferencia de "Servicios"/"Trabajadores" (owner/admin escritura,
// reception lectura), aquí admin y reception no tienen NINGÚN acceso, ni de
// lectura. RLS ya lo refuerza con has_role_in_salon(salon_id, ['owner']) en
// las 4 tablas; esto es la segunda capa (doble refuerzo, sección 7).
async function requireFinancesAccess() {
  const session = await getCurrentSession();
  const activeMembership = session?.activeMembership;

  if (!session || !activeMembership) {
    return { ok: false as const, error: "auth.login.noMembership" };
  }

  if (activeMembership.role !== "owner") {
    return { ok: false as const, error: "finances.errors.forbidden" };
  }

  return { ok: true as const, salonId: activeMembership.salon!.id };
}

// --- Gastos ------------------------------------------------------------------

export async function createExpenseAction(formData: FormData): Promise<ActionResult> {
  const access = await requireFinancesAccess();
  if (!access.ok) return access;

  const parsed = expenseSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description") ?? "",
    amount: formData.get("amount"),
    spentAt: formData.get("spentAt"),
    supplierId: formData.get("supplierId") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "finances.expenses.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await createExpenseRow(supabase, {
      salonId: access.salonId,
      category: parsed.data.category,
      description: parsed.data.description || null,
      amountCents: parseMoneyToCents(parsed.data.amount),
      spentAt: parsed.data.spentAt,
      supplierId: parsed.data.supplierId || null,
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "finances.expenses.errors.generic" };
  }
}

export async function updateExpenseAction(formData: FormData): Promise<ActionResult> {
  const access = await requireFinancesAccess();
  if (!access.ok) return access;

  const expenseId = formData.get("expenseId");
  if (typeof expenseId !== "string" || expenseId.length === 0) {
    return { ok: false, error: "finances.expenses.errors.invalidInput" };
  }

  const parsed = expenseSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description") ?? "",
    amount: formData.get("amount"),
    spentAt: formData.get("spentAt"),
    supplierId: formData.get("supplierId") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "finances.expenses.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await updateExpenseRow(supabase, expenseId, {
      category: parsed.data.category,
      description: parsed.data.description || null,
      amountCents: parseMoneyToCents(parsed.data.amount),
      spentAt: parsed.data.spentAt,
      supplierId: parsed.data.supplierId || null,
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "finances.expenses.errors.generic" };
  }
}

export async function deleteExpenseAction(expenseId: string): Promise<ActionResult> {
  const access = await requireFinancesAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    await deleteExpenseRow(supabase, expenseId);
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "finances.expenses.errors.generic" };
  }
}

// --- Nóminas -------------------------------------------------------------------

export async function createStaffPayoutAction(formData: FormData): Promise<ActionResult> {
  const access = await requireFinancesAccess();
  if (!access.ok) return access;

  const parsed = staffPayoutSchema.safeParse({
    staffId: formData.get("staffId"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    baseAmount: formData.get("baseAmount"),
    bonusAmount: formData.get("bonusAmount"),
  });

  if (!parsed.success) {
    return { ok: false, error: "finances.payouts.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await createStaffPayoutRow(supabase, {
      salonId: access.salonId,
      staffId: parsed.data.staffId,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      baseCents: parseMoneyToCents(parsed.data.baseAmount),
      bonusCents: parseMoneyToCents(parsed.data.bonusAmount),
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "finances.payouts.errors.generic" };
  }
}

export async function updateStaffPayoutAction(formData: FormData): Promise<ActionResult> {
  const access = await requireFinancesAccess();
  if (!access.ok) return access;

  const payoutId = formData.get("payoutId");
  if (typeof payoutId !== "string" || payoutId.length === 0) {
    return { ok: false, error: "finances.payouts.errors.invalidInput" };
  }

  const parsed = staffPayoutSchema.safeParse({
    staffId: formData.get("staffId"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    baseAmount: formData.get("baseAmount"),
    bonusAmount: formData.get("bonusAmount"),
  });

  if (!parsed.success) {
    return { ok: false, error: "finances.payouts.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await updateStaffPayoutRow(supabase, payoutId, {
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      baseCents: parseMoneyToCents(parsed.data.baseAmount),
      bonusCents: parseMoneyToCents(parsed.data.bonusAmount),
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "finances.payouts.errors.generic" };
  }
}

export async function markPayoutPaidAction(payoutId: string): Promise<ActionResult> {
  const access = await requireFinancesAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    await updateStaffPayoutRow(supabase, payoutId, {
      status: "paid",
      paidAt: new Date().toISOString(),
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "finances.payouts.errors.generic" };
  }
}
