"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import { clientSchema, parsePreferences } from "@/lib/validations/clients";
import { createClientRow, updateClientRow } from "@/lib/db/clients";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// A diferencia de "servicios" (owner/admin), CLAUDE.md sección 7 da a los 3
// roles (owner/admin/reception) lectura Y escritura sobre "Clientes" — no
// hace falta has_role_in_salon, solo una membership activa.
async function requireClientsAccess() {
  const session = await getCurrentSession();
  const activeMembership = session?.activeMembership;

  if (!session || !activeMembership) {
    return { ok: false as const, error: "auth.login.noMembership" };
  }

  return { ok: true as const, salonId: activeMembership.salon!.id };
}

export async function createClientAction(formData: FormData): Promise<ActionResult> {
  const access = await requireClientsAccess();
  if (!access.ok) return access;

  const parsed = clientSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    notes: formData.get("notes") ?? "",
    preferences: formData.get("preferences") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "clients.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await createClientRow(supabase, {
      salonId: access.salonId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
      preferences: parsePreferences(parsed.data.preferences),
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "clients.errors.generic" };
  }
}

export async function updateClientAction(formData: FormData): Promise<ActionResult> {
  const access = await requireClientsAccess();
  if (!access.ok) return access;

  const clientId = formData.get("clientId");
  if (typeof clientId !== "string" || clientId.length === 0) {
    return { ok: false, error: "clients.errors.invalidInput" };
  }

  const parsed = clientSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    notes: formData.get("notes") ?? "",
    preferences: formData.get("preferences") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "clients.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await updateClientRow(supabase, clientId, {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
      preferences: parsePreferences(parsed.data.preferences),
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "clients.errors.generic" };
  }
}

export async function setClientActiveAction(
  clientId: string,
  isActive: boolean
): Promise<ActionResult> {
  const access = await requireClientsAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    await updateClientRow(supabase, clientId, { isActive });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "clients.errors.generic" };
  }
}
