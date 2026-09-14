import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // 1) Resolver primero el ruteo de idioma (puede redirigir/reescribir).
  const response = intlMiddleware(request);
  // 2) Refrescar la sesión de Supabase sobre ESA MISMA respuesta.
  return updateSession(request, response);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
