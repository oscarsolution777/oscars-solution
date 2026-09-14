import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";

// Refresca la sesión de Supabase escribiendo las cookies sobre la MISMA
// NextResponse que ya trae resuelto el ruteo de idioma de next-intl
// (src/middleware.ts la construye primero). Usar una sola NextResponse es
// crítico: si se crean dos por error, las cookies de sesión refrescada se
// pierden y el usuario aparece deslogueado tras recargar.
export async function updateSession(
  request: NextRequest,
  response: NextResponse
) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Fuerza el refresh del token si hace falta (necesario para no perder la
  // sesión al navegar entre Server Components).
  await supabase.auth.getUser();

  return response;
}
