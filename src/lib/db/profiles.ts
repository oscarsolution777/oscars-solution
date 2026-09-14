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
