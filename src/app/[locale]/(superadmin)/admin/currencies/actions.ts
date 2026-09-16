"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import { createCurrencySchema, subscriptionPriceSchema } from "@/lib/validations/platform-currency";
import {
  createCurrency,
  updateCurrencyActive,
  setActiveSubscriptionPrice,
} from "@/lib/db/platform-currencies";
import { parseMoneyToCents } from "@/lib/utils/money";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requirePlatformAdminAccess() {
  const session = await getCurrentSession();

  if (!session) {
    return { ok: false as const, error: "auth.login.noMembership" };
  }
  if (!session.isPlatformAdmin) {
    return { ok: false as const, error: "superadmin.currencies.currencyForm.genericError" };
  }

  return { ok: true as const };
}

export async function createCurrencyAction(formData: FormData): Promise<ActionResult> {
  const access = await requirePlatformAdminAccess();
  if (!access.ok) return access;

  const parsed = createCurrencySchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    symbol: formData.get("symbol"),
  });
  if (!parsed.success) {
    return { ok: false, error: "superadmin.currencies.currencyForm.codeError" };
  }

  try {
    const supabase = await createClient();
    await createCurrency(supabase, parsed.data);
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "superadmin.currencies.currencyForm.genericError" };
  }
}

export async function setCurrencyActiveAction(
  code: string,
  isActive: boolean
): Promise<ActionResult> {
  const access = await requirePlatformAdminAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    await updateCurrencyActive(supabase, code, isActive);
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "superadmin.currencies.currencyForm.genericError" };
  }
}

export async function setSubscriptionPriceAction(
  formData: FormData
): Promise<ActionResult> {
  const access = await requirePlatformAdminAccess();
  if (!access.ok) return access;

  const parsed = subscriptionPriceSchema.safeParse({
    currencyCode: formData.get("currencyCode"),
    price: formData.get("price"),
  });
  if (!parsed.success) {
    return { ok: false, error: "superadmin.currencies.priceForm.priceError" };
  }

  try {
    const supabase = await createClient();
    await setActiveSubscriptionPrice(supabase, {
      currencyCode: parsed.data.currencyCode,
      priceCents: parseMoneyToCents(parsed.data.price),
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "superadmin.currencies.priceForm.genericError" };
  }
}
