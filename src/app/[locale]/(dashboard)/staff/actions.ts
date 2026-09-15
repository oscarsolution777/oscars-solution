"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import { staffSchema } from "@/lib/validations/staff";
import { parseMoneyToCents } from "@/lib/utils/money";
import { createStaffRow, updateStaffRow } from "@/lib/db/staff";
import { setServiceStaffAssignments } from "@/lib/db/service-staff";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const WRITE_ROLES = ["owner", "admin"] as const;

async function requireStaffWriteAccess() {
  const session = await getCurrentSession();
  const activeMembership = session?.activeMembership;

  if (!session || !activeMembership) {
    return { ok: false as const, error: "auth.login.noMembership" };
  }

  if (!WRITE_ROLES.includes(activeMembership.role as (typeof WRITE_ROLES)[number])) {
    return { ok: false as const, error: "staff.errors.forbidden" };
  }

  return { ok: true as const, salonId: activeMembership.salon!.id };
}

export async function createStaffAction(formData: FormData): Promise<ActionResult> {
  const access = await requireStaffWriteAccess();
  if (!access.ok) return access;

  const parsed = staffSchema.safeParse({
    fullName: formData.get("fullName"),
    roleTitle: formData.get("roleTitle"),
    phone: formData.get("phone") ?? "",
    baseSalary: formData.get("baseSalary"),
    hiredAt: formData.get("hiredAt"),
  });

  if (!parsed.success) {
    return { ok: false, error: "staff.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await createStaffRow(supabase, {
      salonId: access.salonId,
      fullName: parsed.data.fullName,
      roleTitle: parsed.data.roleTitle,
      phone: parsed.data.phone || null,
      baseSalaryCents: parseMoneyToCents(parsed.data.baseSalary),
      hiredAt: parsed.data.hiredAt,
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "staff.errors.generic" };
  }
}

export async function updateStaffAction(formData: FormData): Promise<ActionResult> {
  const access = await requireStaffWriteAccess();
  if (!access.ok) return access;

  const staffId = formData.get("staffId");
  if (typeof staffId !== "string" || staffId.length === 0) {
    return { ok: false, error: "staff.errors.invalidInput" };
  }

  const parsed = staffSchema.safeParse({
    fullName: formData.get("fullName"),
    roleTitle: formData.get("roleTitle"),
    phone: formData.get("phone") ?? "",
    baseSalary: formData.get("baseSalary"),
    hiredAt: formData.get("hiredAt"),
  });

  if (!parsed.success) {
    return { ok: false, error: "staff.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await updateStaffRow(supabase, staffId, {
      fullName: parsed.data.fullName,
      roleTitle: parsed.data.roleTitle,
      phone: parsed.data.phone || null,
      baseSalaryCents: parseMoneyToCents(parsed.data.baseSalary),
      hiredAt: parsed.data.hiredAt,
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "staff.errors.generic" };
  }
}

export async function setStaffActiveAction(
  staffId: string,
  isActive: boolean
): Promise<ActionResult> {
  const access = await requireStaffWriteAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    await updateStaffRow(supabase, staffId, { isActive });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "staff.errors.generic" };
  }
}

export async function updateStaffServicesAction(
  staffId: string,
  serviceIds: string[]
): Promise<ActionResult> {
  const access = await requireStaffWriteAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    await setServiceStaffAssignments(supabase, staffId, serviceIds);
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "staff.servicesForm.genericError" };
  }
}
