import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/profiles";
import { getActiveMembershipsForUser } from "@/lib/db/memberships";

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

  // Fase 0: sin selector de salón activo todavía (eso es Fase 10). Se usa
  // la primera membresía activa como el salón "actual" del usuario.
  const activeMembership = memberships[0] ?? null;

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
