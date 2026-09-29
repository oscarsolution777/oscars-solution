import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getProfile(supabase: SupabaseServerClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, phone, locale")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

// Selector de idioma del panel (CLAUDE.md sección 5: "preferencia del
// usuario, profiles.locale, con selector en el header"). Escritura directa
// (no una función security definer): la política RLS profiles_update_self
// (migración 0003) ya permite a cada usuario editar su propia fila, y esto
// no toca ningún otro dato sensible.
export async function updateProfileLocale(
  supabase: SupabaseServerClient,
  userId: string,
  locale: string
) {
  const { error } = await supabase
    .from("profiles")
    .update({ locale })
    .eq("id", userId);

  if (error) throw error;
}
