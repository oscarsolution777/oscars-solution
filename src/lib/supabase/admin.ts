import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Cliente con SUPABASE_SERVICE_ROLE_KEY: ignora RLS por completo.
// SOLO código de servidor (jobs, scripts, rutas admin muy puntuales).
// Si esta clave aparece en un componente "use client", es un bug crítico
// (CLAUDE.md sección 7, regla 5).
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
