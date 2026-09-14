// Prueba de integración de RLS: requiere Supabase local corriendo
// (`npx supabase start`) con las migraciones + seed aplicados.
// Crea 2 salones y 2 usuarios efímeros y confirma que un usuario del salón A
// no puede leer filas del salón B, y que un platform_admin sí ve ambos.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const canRun = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);
const describeIfConfigured = canRun ? describe : describe.skip;

describeIfConfigured("aislamiento multi-tenant (RLS)", () => {
  const admin = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const suffix = Date.now();
  const salonAId = crypto.randomUUID();
  const salonBId = crypto.randomUUID();
  const userAEmail = `rls-test-a-${suffix}@example.com`;
  const userBEmail = `rls-test-b-${suffix}@example.com`;
  const password = "TestPassword123!";

  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    await admin.from("salons").insert([
      {
        id: salonAId,
        name: `Salón RLS A ${suffix}`,
        slug: `salon-rls-a-${suffix}`,
        currency: "GYD",
      },
      {
        id: salonBId,
        name: `Salón RLS B ${suffix}`,
        slug: `salon-rls-b-${suffix}`,
        currency: "GYD",
      },
    ]);

    const { data: userA } = await admin.auth.admin.createUser({
      email: userAEmail,
      password,
      email_confirm: true,
    });
    const { data: userB } = await admin.auth.admin.createUser({
      email: userBEmail,
      password,
      email_confirm: true,
    });
    userAId = userA!.user!.id;
    userBId = userB!.user!.id;

    await admin.from("memberships").insert([
      { user_id: userAId, salon_id: salonAId, role: "owner" },
      { user_id: userBId, salon_id: salonBId, role: "owner" },
    ]);
  });

  afterAll(async () => {
    await admin.from("salons").delete().in("id", [salonAId, salonBId]);
    await admin.auth.admin.deleteUser(userAId);
    await admin.auth.admin.deleteUser(userBId);
  });

  it("un usuario del salón A no puede leer el salón B", async () => {
    const clientA = createClient<Database>(SUPABASE_URL!, ANON_KEY!);
    await clientA.auth.signInWithPassword({ email: userAEmail, password });

    const { data: ownSalon } = await clientA
      .from("salons")
      .select("id")
      .eq("id", salonAId)
      .maybeSingle();
    expect(ownSalon?.id).toBe(salonAId);

    const { data: otherSalon } = await clientA
      .from("salons")
      .select("id")
      .eq("id", salonBId)
      .maybeSingle();
    expect(otherSalon).toBeNull();
  });

  it("un platform_admin ve ambos salones", async () => {
    await admin.from("platform_admins").insert({ user_id: userAId });

    const clientAdmin = createClient<Database>(SUPABASE_URL!, ANON_KEY!);
    await clientAdmin.auth.signInWithPassword({
      email: userAEmail,
      password,
    });

    const { data } = await clientAdmin
      .from("salons")
      .select("id")
      .in("id", [salonAId, salonBId]);

    expect(data?.map((row) => row.id).sort()).toEqual(
      [salonAId, salonBId].sort()
    );

    await admin.from("platform_admins").delete().eq("user_id", userAId);
  });
});
