import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

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
