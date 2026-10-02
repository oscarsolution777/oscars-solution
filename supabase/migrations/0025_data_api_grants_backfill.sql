-- Backfill de GRANT explícitos de la Data API, a pedido de Supabase (aviso
-- por correo, 2026-10-01): a partir del 30 de octubre de 2026, Supabase deja
-- de otorgar automáticamente acceso de la API (PostgREST/supabase-js) a las
-- tablas nuevas del esquema public. Las tablas YA EXISTENTES de un proyecto
-- ya creado no se ven afectadas ("permanecerán sin cambios") -- este
-- proyecto, en producción hoy, sigue funcionando igual sin esta migración.
--
-- El riesgo real es otro: cualquier vez que el historial completo de
-- migraciones se vuelva a ejecutar desde cero -- un reset local
-- (`npm run db:reset`), una rama de preview de Supabase, o un proyecto nuevo
-- en otro país/región (ej. al mudarse a Brasil) -- las tablas creadas sin
-- GRANT explícito quedarían inaccesibles por la API desde el primer minuto,
-- aunque sus políticas RLS estén perfectas (GRANT y RLS son capas distintas:
-- GRANT decide si el rol puede intentar la operación, RLS decide qué filas
-- ve una vez que ya pudo intentarla).
--
-- Dos huecos encontrados al auditar las 24 migraciones anteriores:
--
-- (A) 7 tablas nunca tuvieron NINGÚN grant explícito (dependían 100% del
--     otorgamiento automático que Supabase retira): platform_admins,
--     currencies, subscription_prices, salons, profiles, memberships,
--     audit_log. Las primeras 6 son justo las tablas de las que depende el
--     login -- sin esto, un proyecto nuevo no arrancaría en absoluto.
-- (B) NINGUNA de las 27 tablas del proyecto, ni siquiera las que sí otorgan
--     a anon/authenticated desde su propia migración, le otorga nada a
--     service_role. El cliente admin (`src/lib/supabase/admin.ts`,
--     `SUPABASE_SERVICE_ROLE_KEY`) se usa en código real (no solo scripts)
--     para insertar directo en salons/memberships/service_categories/
--     services al crear un salón (`src/lib/db/platform-salons.ts`) y en
--     requests/request_items al recibir una solicitud del portal QR
--     (`src/app/[locale]/(public)/s/[slug]/solicitud/actions.ts`) -- sin
--     esto, crear un salón o recibir una solicitud del portal dejaría de
--     funcionar en cualquier proyecto nuevo.
--
-- Se otorga a service_role acceso completo (select/insert/update/delete) en
-- las 27 tablas de una sola vez, en vez de rastrear uno por uno cada camino
-- de escritura real: es la misma llave de servidor que ya evita RLS por
-- diseño (CLAUDE.md sección 7.5, nunca expuesta al navegador) y es el propio
-- patrón que sugiere el correo de Supabase para ese rol. Otorgarle el GRANT
-- a nivel de tabla no amplía lo que ya puede hacer hoy -- solo lo hace
-- explícito, como exige el nuevo régimen.
--
-- Para anon/authenticated de las 7 tablas del punto (A), el alcance otorgado
-- replica exactamente lo que sus propias políticas RLS ya permiten hoy (ver
-- cada bloque abajo) -- no se abre nada que la política no deje pasar
-- igual.
--
-- Regla nueva a partir de aquí (CLAUDE.md sección 7, regla 10): toda
-- migración que cree una tabla debe incluir sus GRANT (anon si aplica /
-- authenticated / service_role) en la misma migración, nunca depender del
-- otorgamiento automático.

-- (A) --------------------------------------------------------------------

-- platform_admins: solo lectura por RLS (self o platform admin); sin
-- política de insert/update/delete -- el alta es manual por SQL editor
-- (comentario original en 0002). service_role sí necesita escritura: el
-- script scripts/seed-platform-admin.mjs hace upsert directo con el cliente
-- admin.
grant select on public.platform_admins to authenticated;
grant select, insert, update, delete on public.platform_admins to service_role;

-- currencies: RLS "currencies_admin_write" permite insert/update/delete a
-- cualquier authenticated que sea platform admin (el rol de Postgres sigue
-- siendo "authenticated" para todos, RLS es la capa que distingue al
-- SuperAdmin -- el GRANT solo habilita el tipo de operación).
grant select, insert, update, delete on public.currencies to authenticated;
grant select, insert, update, delete on public.currencies to service_role;

-- subscription_prices: mismo criterio ("subscription_prices_admin_only").
grant select, insert, update, delete on public.subscription_prices to authenticated;
grant select, insert, update, delete on public.subscription_prices to service_role;

-- salons: anon ya tenía "select" desde la migración 0013 (portal QR por
-- slug) -- no se toca. Falta authenticated completo (lectura por membership,
-- escritura por "salons_admin_write").
grant select, insert, update, delete on public.salons to authenticated;
grant select, insert, update, delete on public.salons to service_role;

-- profiles: RLS solo permite select (self/admin) y update (self) a
-- authenticated -- el insert real lo hace el trigger handle_new_user() como
-- security definer (se ejecuta con los privilegios de su dueño, no necesita
-- GRANT sobre el rol que dispara el insert en auth.users). Sin política de
-- delete.
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

-- memberships: RLS "memberships_admin_write" permite insert/update/delete al
-- platform admin (mismo razonamiento que currencies arriba).
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.memberships to service_role;

-- audit_log: solo lectura para la dueña (has_role_in_salon owner); sin
-- política de insert -- la única vía de escritura es log_audit_event()
-- (security definer), que tampoco necesita GRANT sobre authenticated.
grant select on public.audit_log to authenticated;
grant select, insert, update, delete on public.audit_log to service_role;

-- (B) service_role en el resto de tablas (ya tenían anon/authenticated) ----

grant select, insert, update, delete on public.service_categories to service_role;
grant select, insert, update, delete on public.services to service_role;
grant select, insert, update, delete on public.clients to service_role;
grant select, insert, update, delete on public.staff to service_role;
grant select, insert, update, delete on public.service_staff to service_role;
grant select, insert, update, delete on public.suppliers to service_role;
grant select, insert, update, delete on public.products to service_role;
grant select, insert, update, delete on public.stock_movements to service_role;
grant select, insert, update, delete on public.service_products to service_role;
grant select, insert, update, delete on public.requests to service_role;
grant select, insert, update, delete on public.request_items to service_role;
grant select, insert, update, delete on public.appointments to service_role;
grant select, insert, update, delete on public.appointment_items to service_role;
grant select, insert, update, delete on public.payments to service_role;
grant select, insert, update, delete on public.cash_closures to service_role;
grant select, insert, update, delete on public.expenses to service_role;
grant select, insert, update, delete on public.staff_payouts to service_role;
grant select, insert, update, delete on public.ai_analyses to service_role;
grant select, insert, update, delete on public.ai_regenerate_usage to service_role;
grant select, insert, update, delete on public.ai_chat_messages to service_role;
