// Crea el usuario owner del salón piloto vía el Admin API de Supabase Auth.
// No vive en supabase/seed.sql porque el esquema interno de auth.users/GoTrue
// no es un contrato público estable. Funciona igual contra Supabase local
// (`supabase start`) o contra un proyecto en la nube: solo cambian las
// variables de entorno en .env.local.
//
// Uso: node --env-file=.env.local scripts/seed-demo-user.mjs
// (invocado por "npm run db:reset", ver package.json)
// Requiere: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en .env.local

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local"
  );
  process.exit(1);
}

const PILOT_SALON_ID = "11111111-1111-1111-1111-111111111111";
const DEMO_EMAIL = "owner@salonpiloto.demo";
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "ChangeMe123!";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: existing } = await admin.auth.admin.listUsers();
  let user = existing?.users?.find((u) => u.email === DEMO_EMAIL);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Dueña Salón Piloto", locale: "es" },
    });
    if (error) throw error;
    user = data.user;
    console.log(`Usuario creado: ${DEMO_EMAIL}`);
  } else {
    console.log(`Usuario ya existía: ${DEMO_EMAIL}`);
  }

  const { error: membershipError } = await admin
    .from("memberships")
    .upsert(
      {
        user_id: user.id,
        salon_id: PILOT_SALON_ID,
        role: "owner",
        is_active: true,
      },
      { onConflict: "user_id,salon_id" }
    );
  if (membershipError) throw membershipError;

  console.log(
    `Membership owner asegurada para ${DEMO_EMAIL} en el salón piloto.`
  );
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error("Error creando el usuario demo:", err);
  process.exit(1);
});
