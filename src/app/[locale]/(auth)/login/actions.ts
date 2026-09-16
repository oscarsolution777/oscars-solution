"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";

type ActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function login(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: "auth.login.invalidCredentials" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { ok: false, error: "auth.login.invalidCredentials" };
  }

  // Oscar (único platform admin) no opera un salón propio: va directo al
  // Panel SuperAdmin en vez del panel de gestión.
  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  return { ok: true, redirectTo: isPlatformAdmin ? "/admin/salons" : "/dashboard" };
}
