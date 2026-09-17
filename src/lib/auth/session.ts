import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/profiles";
import { getActiveMembershipsForUser } from "@/lib/db/memberships";

// Fase 10 — selector de salón: cookie que recuerda cuál de las membresías
// activas de la persona es el salón "actual" del panel. No lleva datos
// sensibles (un uuid que la propia persona ya ve en sus memberships), así
// que no hace falta httpOnly.
export const ACTIVE_SALON_COOKIE = "active_salon_id";

export async function getCurrentSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Corrige de forma oportunista cualquier demo vencida antes de resolver el
  // salón activo (Fase 9A, CLAUDE.md sección 6 "Demos con expiración") — sin
  // esto, una dueña de demo podría seguir usando el panel días después de
  // que su acceso debía cortarse. best-effort: si falla (p.ej. RLS/red), no
  // debe romper el login.
  try {
    await supabase.rpc("expire_due_demo_salons");
  } catch {
    // best-effort: no debe romper el login si falla.
  }

  const [profile, memberships, isPlatformAdmin] = await Promise.all([
    getProfile(supabase, user.id),
    getActiveMembershipsForUser(supabase, user.id),
    isCurrentUserPlatformAdmin(supabase),
  ]);

  // Fase 10: el salón "actual" es el que recuerda la cookie, si la persona
  // sigue teniendo una membership activa en él; si no hay cookie o ya no es
  // válida (dejó ese salón, o es la primera vez), se cae a la primera
  // membership activa como antes.
  const cookieStore = await cookies();
  const activeSalonId = cookieStore.get(ACTIVE_SALON_COOKIE)?.value;
  const activeMembership =
    memberships.find((m) => m.salon?.id === activeSalonId) ?? memberships[0] ?? null;

  return { user, profile, memberships, activeMembership, isPlatformAdmin };
}

async function isCurrentUserPlatformAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const { data } = await supabase.rpc("is_platform_admin");
  return data === true;
}

export type CurrentSession = NonNullable<
  Awaited<ReturnType<typeof getCurrentSession>>
>;
