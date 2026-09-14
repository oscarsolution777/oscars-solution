-- Datos de ejemplo para desarrollo local. Deben ser presentables porque
-- también sirven de demo comercial (CLAUDE.md regla 6).
--
-- NO inserta en auth.users: el esquema interno de GoTrue no es un contrato
-- público estable. El usuario owner del salón piloto y su membership se
-- crean por separado con `node scripts/seed-demo-user.mjs` después de
-- `supabase db reset` (ver npm run db:reset).

-- Monedas iniciales soportadas (CLAUDE.md sección 1/7).
insert into public.currencies (code, name, symbol, is_active) values
  ('USD', 'Dólar estadounidense', '$',  true),
  ('GYD', 'Dólar guyanés',        'G$', true),
  ('BRL', 'Real brasileño',       'R$', true),
  ('EUR', 'Euro',                 '€',  true)
on conflict (code) do nothing;

-- Precio de suscripción de ejemplo por moneda/país de la dueña.
-- Valores ilustrativos: ajustar antes de vender (CLAUDE.md sección 13).
insert into public.subscription_prices (currency_code, price_cents, is_active) values
  ('GYD', 1000000, true),
  ('USD', 4900,    true),
  ('BRL', 24900,   true),
  ('EUR', 4900,    true);

-- Primer salón real (piloto), no es demo comercial.
insert into public.salons (
  id, name, slug, phone, address, timezone, currency, default_locale,
  is_active, subscription_status, is_demo
) values (
  '11111111-1111-1111-1111-111111111111',
  'Salón Piloto Georgetown',
  'salon-piloto-georgetown',
  '+592 000 0000',
  'Georgetown, Guyana',
  'America/Guyana',
  'GYD',
  'es',
  true,
  'active',
  false
) on conflict (id) do nothing;
