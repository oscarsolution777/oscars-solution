-- Tablas de nivel plataforma (sin salon_id): platform_admins, currencies, subscription_prices.
-- Estas tablas son la excepción a la "regla de oro" de CLAUDE.md sección 6/7.

-- platform_admins ------------------------------------------------------------
-- Cualquier fila aquí da acceso total al Panel SuperAdmin.
create table public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- security definer: evita la recursión de RLS al consultar esta misma tabla
-- desde dentro de sus propias políticas o desde políticas de otras tablas.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

create policy "platform_admins_select_self_or_admin"
  on public.platform_admins for select
  using (user_id = auth.uid() or public.is_platform_admin());

-- Sin políticas de insert/update/delete: el alta de un platform_admin es un
-- paso manual (SQL editor), nunca una acción disponible desde la app.

-- currencies -------------------------------------------------------------------
-- Precargada con USD, GYD, BRL, EUR (ver seed.sql). El SuperAdmin puede agregar
-- más sin desplegar código nuevo.
create table public.currencies (
  code       text primary key check (code ~ '^[A-Z]{3}$'),
  name       text not null,
  symbol     text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.currencies enable row level security;

create trigger set_updated_at
  before update on public.currencies
  for each row execute function public.set_updated_at();

-- Lectura pública (necesaria para el portal QR y el selector de moneda del
-- panel), pero solo de monedas activas; el SuperAdmin ve todas.
create policy "currencies_public_read_active"
  on public.currencies for select
  using (is_active or public.is_platform_admin());

create policy "currencies_admin_write"
  on public.currencies for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- subscription_prices -----------------------------------------------------------
-- Precio de la suscripción de Oscar's Solution por moneda/país de la dueña.
-- NO es el mismo campo que salons.currency (moneda en la que el salón cobra a
-- sus clientes) — ver CLAUDE.md sección 8, regla MULTI-MONEDA.
create table public.subscription_prices (
  id            uuid primary key default gen_random_uuid(),
  currency_code text not null references public.currencies(code),
  price_cents   integer not null check (price_cents >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Un solo precio activo por moneda a la vez.
create unique index subscription_prices_active_currency_idx
  on public.subscription_prices (currency_code)
  where is_active;

alter table public.subscription_prices enable row level security;

create trigger set_updated_at
  before update on public.subscription_prices
  for each row execute function public.set_updated_at();

-- Sin autoservicio de planes todavía: solo el SuperAdmin puede leer/escribir.
create policy "subscription_prices_admin_only"
  on public.subscription_prices for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
