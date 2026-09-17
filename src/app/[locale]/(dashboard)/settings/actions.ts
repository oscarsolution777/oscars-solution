"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import { salonProfileSchema, salonLogoSchema, membershipUpdateSchema } from "@/lib/validations/salons";
import { updateSalonProfile, getSalonById } from "@/lib/db/salons";
import { updateSalonMembership } from "@/lib/db/memberships";
import { uploadSalonLogo, deleteSalonLogo } from "@/lib/storage/salon-logos";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

// Configuración es owner ✅ / admin parcial (solo lectura) / reception ❌
// (CLAUDE.md sección 7) — ninguna de las dos mutaciones de este archivo se
// permite fuera del rol owner, reforzado también dentro de las funciones SQL
// (update_salon_profile/update_salon_membership, doble capa sección 7).
async function requireSettingsOwner() {
  const session = await getCurrentSession();
  const activeMembership = session?.activeMembership;

  if (!session || !activeMembership) {
    return { ok: false as const, error: "auth.login.noMembership" };
  }
  if (activeMembership.role !== "owner") {
    return { ok: false as const, error: "settings.errors.forbidden" };
  }

  return { ok: true as const, salonId: activeMembership.salon!.id };
}

// Las funciones SQL devuelven un código snake_case corto (mismo estilo que
// cancel_request_by_code/request_reschedule_by_code en Fase 3); se traduce
// aquí a la clave de i18n camelCase que usa el resto del panel.
const BUSINESS_ERROR_KEYS: Record<string, string> = {
  forbidden: "settings.errors.forbidden",
  invalid_input: "settings.errors.invalidInput",
  not_found: "settings.errors.notFound",
  cannot_edit_self: "settings.errors.cannotEditSelf",
  invalid_role: "settings.errors.invalidRole",
};

function mapBusinessError(code: string): string {
  return BUSINESS_ERROR_KEYS[code] ?? "settings.errors.generic";
}

export async function updateSalonProfileAction(formData: FormData): Promise<ActionResult> {
  const access = await requireSettingsOwner();
  if (!access.ok) return access;

  const parsed = salonProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    timezone: formData.get("timezone"),
    defaultLocale: formData.get("defaultLocale"),
  });

  if (!parsed.success) {
    return { ok: false, error: "settings.errors.invalidInput" };
  }

  const logoFile = formData.get("logo");
  const hasNewLogo = logoFile instanceof File && logoFile.size > 0;

  if (hasNewLogo) {
    const logoParsed = salonLogoSchema.safeParse(logoFile);
    if (!logoParsed.success) {
      return { ok: false, error: "settings.errors.invalidLogo" };
    }
  }

  try {
    const supabase = await createClient();
    const existing = await getSalonById(supabase, access.salonId);

    let logoUrl = existing.logo_url;
    if (hasNewLogo && logoFile instanceof File) {
      logoUrl = await uploadSalonLogo(supabase, access.salonId, logoFile);
    }

    const result = await updateSalonProfile(supabase, {
      salonId: access.salonId,
      name: parsed.data.name,
      logoUrl,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      timezone: parsed.data.timezone,
      defaultLocale: parsed.data.defaultLocale,
    });

    if (!result.ok) {
      return { ok: false, error: mapBusinessError(result.error) };
    }

    if (hasNewLogo && existing.logo_url) {
      try {
        await deleteSalonLogo(supabase, existing.logo_url);
      } catch {
        // Best-effort: el logo anterior queda huérfano en storage, pero la
        // actualización principal ya se aplicó con éxito.
      }
    }

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "settings.errors.generic" };
  }
}

export async function updateSalonMembershipAction(
  membershipId: string,
  role: string,
  isActive: boolean
): Promise<ActionResult> {
  const access = await requireSettingsOwner();
  if (!access.ok) return access;

  const parsed = membershipUpdateSchema.safeParse({ role, isActive });
  if (!parsed.success) {
    return { ok: false, error: "settings.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    const result = await updateSalonMembership(supabase, {
      membershipId,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    });

    if (!result.ok) {
      return { ok: false, error: mapBusinessError(result.error) };
    }

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "settings.errors.generic" };
  }
}
