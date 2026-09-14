import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

// Cliente Supabase para Server Components / Server Actions (respeta RLS con
// la sesión del usuario logueado). Nunca usar en "use client".
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Ignorable: ocurre al llamar setAll desde un Server Component
            // (sin permiso de escritura de cookies). El middleware ya se
            // encarga de refrescar la sesión en ese caso.
          }
        },
      },
    }
  );
}
