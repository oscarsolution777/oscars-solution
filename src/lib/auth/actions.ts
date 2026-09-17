"use server";

import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/lib/i18n/navigation";
import { getCurrentSession, ACTIVE_SALON_COOKIE } from "./session";

// Fase 10 — selector de salón para dueñas con cadena. Valida que el salón
// pedido esté realmente entre las memberships activas de la sesión (nunca se
// confía en un id que venga solo del cliente) antes de escribir la cookie
// que getCurrentSession() usa para resolver el salón "actual".
export async function setActiveSalonAction(salonId: string) {
  const session = await getCurrentSession();
  const locale = await getLocale();

  const belongsToUser = session?.memberships.some((m) => m.salon?.id === salonId);
  if (belongsToUser) {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_SALON_COOKIE, salonId, {
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  redirect({ href: "/dashboard", locale });
}
