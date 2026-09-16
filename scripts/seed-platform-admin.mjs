// Da de alta (o reutiliza) el usuario de Supabase Auth para el email indicado
// y lo inserta en platform_admins. Mismo patrón que seed-demo-user.mjs: usa
// el Admin API porque auth.users/GoTrue no es un contrato público estable.
//
// Uso: node --env-file=.env.local scripts/seed-platform-admin.mjs <email>

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
if (!email) {
  console.error("Uso: node --env-file=.env.local scripts/seed-platform-admin.mjs <email>");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: existing } = await admin.auth.admin.listUsers();
  let user = existing?.users?.find((u) => u.email === email);
  let temporaryPassword = null;

  if (!user) {
    temporaryPassword = crypto.randomUUID().slice(0, 12);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: "Oscar", locale: "es" },
    });
    if (error) throw error;
    user = data.user;
    console.log(`Usuario creado: ${email}`);
  } else {
    console.log(`Usuario ya existía: ${email}`);
  }

  const { error: adminError } = await admin
    .from("platform_admins")
    .upsert({ user_id: user.id }, { onConflict: "user_id" });
  if (adminError) throw adminError;

  console.log(`platform_admins asegurado para ${email} (user_id: ${user.id})`);
  if (temporaryPassword) {
    console.log(`Login: ${email} / ${temporaryPassword}`);
  } else {
    console.log("Usuario ya existía: usa la contraseña que ya tenías.");
  }
}

main().catch((err) => {
  console.error("Error dando de alta el platform admin:", err);
  process.exit(1);
});
