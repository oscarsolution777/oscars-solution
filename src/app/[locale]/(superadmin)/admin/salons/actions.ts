"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createSalonSchema,
  createDemoSalonSchema,
  parseDemoDurationDays,
} from "@/lib/validations/platform-salon";
import {
  createSalonRow,
  createOwnerAccountForSalon,
  cloneCatalogToSalon,
  updateSalonStatus,
} from "@/lib/db/platform-salons";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const PILOT_SALON_ID = "11111111-1111-1111-1111-111111111111";
const DEFAULT_DEMO_DURATION_DAYS = "3";

async function requirePlatformAdminAccess() {
  const session = await getCurrentSession();

  if (!session) {
    return { ok: false as const, error: "auth.login.noMembership" };
  }
  if (!session.isPlatformAdmin) {
    return { ok: false as const, error: "superadmin.salons.errors.generic" };
  }

  return { ok: true as const };
}

function readCommonSalonFields(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    timezone: formData.get("timezone"),
    currency: formData.get("currency"),
    defaultLocale: formData.get("defaultLocale"),
    ownerEmail: formData.get("ownerEmail"),
    ownerFullName: formData.get("ownerFullName"),
  };
}

export async function createSalonAction(
  formData: FormData
): Promise<ActionResult<{ email: string; temporaryPassword: string }>> {
  const access = await requirePlatformAdminAccess();
  if (!access.ok) return access;

  const parsed = createSalonSchema.safeParse(readCommonSalonFields(formData));
  if (!parsed.success) {
    return { ok: false, error: "superadmin.salons.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    const salon = await createSalonRow(supabase, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
      defaultLocale: parsed.data.defaultLocale,
      isDemo: false,
      demoExpiresAt: null,
    });

    const adminClient = createAdminClient();
    const { temporaryPassword } = await createOwnerAccountForSalon(adminClient, {
      email: parsed.data.ownerEmail,
      fullName: parsed.data.ownerFullName,
      locale: parsed.data.defaultLocale,
      salonId: salon.id,
    });

    return { ok: true, data: { email: parsed.data.ownerEmail, temporaryPassword } };
  } catch {
    return { ok: false, error: "superadmin.salons.errors.generic" };
  }
}

export async function createDemoSalonAction(
  formData: FormData
): Promise<ActionResult<{ email: string; temporaryPassword: string }>> {
  const access = await requirePlatformAdminAccess();
  if (!access.ok) return access;

  const parsed = createDemoSalonSchema.safeParse({
    ...readCommonSalonFields(formData),
    demoDurationDays: formData.get("demoDurationDays") || DEFAULT_DEMO_DURATION_DAYS,
  });
  if (!parsed.success) {
    return { ok: false, error: "superadmin.salons.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    const demoExpiresAt = new Date(
      Date.now() + parseDemoDurationDays(parsed.data.demoDurationDays) * 24 * 60 * 60 * 1000
    ).toISOString();

    const salon = await createSalonRow(supabase, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
      defaultLocale: parsed.data.defaultLocale,
      isDemo: true,
      demoExpiresAt,
    });

    await cloneCatalogToSalon(supabase, PILOT_SALON_ID, salon.id);

    const adminClient = createAdminClient();
    const { temporaryPassword } = await createOwnerAccountForSalon(adminClient, {
      email: parsed.data.ownerEmail,
      fullName: parsed.data.ownerFullName,
      locale: parsed.data.defaultLocale,
      salonId: salon.id,
    });

    return { ok: true, data: { email: parsed.data.ownerEmail, temporaryPassword } };
  } catch {
    return { ok: false, error: "superadmin.salons.errors.generic" };
  }
}

export async function setSalonStatusAction(
  salonId: string,
  status: "active" | "suspended"
): Promise<ActionResult> {
  const access = await requirePlatformAdminAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    await updateSalonStatus(supabase, salonId, status);
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "superadmin.salons.errors.generic" };
  }
}
