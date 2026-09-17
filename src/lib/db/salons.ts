import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type UpdateResult = { ok: true } | { ok: false; error: string };

export async function getSalonById(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase
    .from("salons")
    .select(
      "id, name, slug, logo_url, phone, address, timezone, currency, default_locale, is_active, subscription_status, is_demo, demo_expires_at"
    )
    .eq("id", salonId)
    .single();

  if (error) throw error;
  return data;
}

// Portal público (Fase 2): lectura anónima por slug, vía la política RLS
// salons_select_anon (migración 0013) — ya filtra is_active/subscription_status,
// así que un salón suspendido o inexistente simplemente no devuelve fila.
export async function getSalonBySlug(supabase: SupabaseServerClient, slug: string) {
  const { data, error } = await supabase
    .from("salons")
    .select("id, name, slug, logo_url, phone, address, timezone, currency, default_locale")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Autoservicio de datos del salón (Fase 10) vía función security definer:
// el owner puede tocar name/logo_url/phone/address/timezone/default_locale,
// nunca currency/subscription_status/is_demo/demo_expires_at/slug/is_active
// (siguen siendo exclusivas del Panel SuperAdmin, CLAUDE.md sección 10).
export async function updateSalonProfile(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    name: string;
    logoUrl: string | null;
    phone: string | null;
    address: string | null;
    timezone: string;
    defaultLocale: string;
  }
): Promise<UpdateResult> {
  // El generador de tipos de Supabase no marca como nullable los parámetros
  // `text` sin DEFAULT, aunque la función SQL sí acepte null (mismo caso que
  // p_entity_id en log_audit_event) -- son genuinamente nullable en la firma
  // real de la función.
  const { data, error } = await supabase.rpc("update_salon_profile", {
    p_salon_id: input.salonId,
    p_name: input.name,
    p_logo_url: input.logoUrl as string,
    p_phone: input.phone as string,
    p_address: input.address as string,
    p_timezone: input.timezone,
    p_default_locale: input.defaultLocale,
  });
  if (error) throw error;
  return data as UpdateResult;
}
