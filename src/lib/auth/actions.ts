"use server";

import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { updateProfileLocale } from "@/lib/db/profiles";
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

// Selector de idioma del panel/SuperAdmin (CLAUDE.md sección 5). El cambio de
// idioma de la URL lo maneja el propio componente cliente (router.replace al
// mismo path con otro locale, igual que el LocaleSwitcher del portal QR);
// esta acción solo persiste la preferencia en profiles.locale, para que la
// próxima vez que la persona inicie sesión (desde cualquier dispositivo) el
// panel ya cargue en su idioma — algo que la cookie NEXT_LOCALE de next-intl
// no logra por sí sola, porque vive solo en ese navegador.
export async function updateProfileLocaleAction(locale: string) {
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) return;

  const session = await getCurrentSession();
  if (!session) return;

  const supabase = await createClient();
  try {
    await updateProfileLocale(supabase, session.user.id, locale);
  } catch {
    // best-effort: el cambio de idioma de la URL ya ocurrió en el cliente
    // independientemente de esto; si falla guardar la preferencia, la
    // próxima sesión simplemente vuelve a caer en el idioma anterior.
  }
}
