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

  const [profile, memberships] = await Promise.all([
    getProfile(supabase, user.id),
    getActiveMembershipsForUser(supabase, user.id),
  ]);

  // Fase 0: sin selector de salón activo todavía (eso es Fase 10). Se usa
  // la primera membresía activa como el salón "actual" del usuario.
  const activeMembership = memberships[0] ?? null;

  return { user, profile, memberships, activeMembership };
}

export type CurrentSession = NonNullable<
  Awaited<ReturnType<typeof getCurrentSession>>
>;
