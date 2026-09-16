import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/lib/i18n/navigation";
import { getCurrentSession, type CurrentSession } from "./session";

// Protección real de rutas del panel de gestión. El middleware NO decide
// esto (evita acoplar lógica de negocio al edge); cada layout protegido
// llama a requireAuth() en el servidor (CLAUDE.md sección 7: los permisos
// se comprueban dos veces, la UI nunca es la seguridad).
export async function requireAuth(): Promise<CurrentSession> {
  const session = await getCurrentSession();

  if (!session) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
  }

  return session as CurrentSession;
}

// Protección del Panel SuperAdmin (Fase 9A, CLAUDE.md sección 10): fuera de
// cualquier salon_id, solo para usuarios en platform_admins. Un usuario sin
// sesión va a /login; uno con sesión pero sin ese rol va a /dashboard (no
// tiene nada que hacer en /admin, no es un error de autenticación).
export async function requirePlatformAdmin(): Promise<CurrentSession> {
  const session = await getCurrentSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
  }

  if (!(session as CurrentSession).isPlatformAdmin) {
    redirect({ href: "/dashboard", locale });
  }

  return session as CurrentSession;
}
