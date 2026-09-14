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
