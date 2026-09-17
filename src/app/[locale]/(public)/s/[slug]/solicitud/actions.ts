"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSalonBySlug } from "@/lib/db/salons";
import { listServices } from "@/lib/db/services";
import { createRequestWithItems } from "@/lib/db/requests";
import { publicRequestSchema, type PublicRequestInput } from "@/lib/validations/public-request";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// El salon_id nunca viaja desde el cliente (CLAUDE.md sección 7.6): se
// resuelve aquí, en el servidor, a partir del slug ya validado por la propia
// política RLS de salons_select_anon.
//
// El insert usa createAdminClient() (mismo patrón que las acciones de
// SuperAdmin en platform-salons.ts), no el cliente anon: `requests` no tiene
// política SELECT para `anon` a propósito (para no exponer la tabla completa,
// ver migración 0013), así que un `.insert().select()` con el cliente anon
// insertaría la fila pero el RETURNING volvería vacío por RLS, dejando la
// solicitud huérfana sin sus items. Las políticas RLS de insert para `anon`
// (migración 0013) se mantienen igual como defensa en profundidad para quien
// llame a PostgREST directamente sin pasar por esta Server Action, que ya
// hace aquí toda la validación que esas políticas también exigen.
export async function submitPublicRequestAction(
  slug: string,
  input: PublicRequestInput
): Promise<ActionResult<{ publicCode: string }>> {
  const parsed = publicRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "portal.form.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    const salon = await getSalonBySlug(supabase, slug);
    if (!salon) {
      return { ok: false, error: "portal.form.errors.salonNotFound" };
    }

    // Nunca se confía en los serviceId recibidos: se revalidan aquí contra
    // los servicios activos reales del salón (CLAUDE.md sección 7.6), ya que
    // el insert de abajo usa el cliente admin y por lo tanto no pasa por la
    // política RLS de request_items_insert_anon que normalmente exige esto.
    const activeServiceIds = new Set(
      (await listServices(supabase, salon.id)).filter((s) => s.is_active).map((s) => s.id)
    );
    if (parsed.data.items.some((item) => !activeServiceIds.has(item.serviceId))) {
      return { ok: false, error: "portal.form.errors.invalidInput" };
    }

    const admin = createAdminClient();
    const request = await createRequestWithItems(admin, {
      salonId: salon.id,
      clientId: null,
      clientName: parsed.data.clientName,
      clientPhone: parsed.data.clientPhone,
      clientEmail: parsed.data.clientEmail || null,
      preferredDate: parsed.data.preferredDate || null,
      items: parsed.data.items.map((item) => ({
        serviceId: item.serviceId,
        staffId: item.staffId || null,
      })),
      source: "qr",
    });

    return { ok: true, data: { publicCode: request.public_code } };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Demasiadas solicitudes")) {
      return { ok: false, error: "portal.form.errors.rateLimited" };
    }
    return { ok: false, error: "portal.form.errors.generic" };
  }
}
