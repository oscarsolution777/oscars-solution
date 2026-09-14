-- Tablas de tenant y acceso de la Fase 0: salons, profiles, memberships.
-- Todas llevan la "regla de oro" de CLAUDE.md sección 6 (id, created_at,
-- updated_at) salvo profiles, cuyo id ES auth.users.id.

-- salons -------------------------------------------------------------------
create table public.salons (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text not null unique check (slug ~ '^[a-z0-9-]+$'),
  logo_url            text,
  phone               text,
  address             text,
  timezone            text not null default 'America/Guyana',
  currency            text not null references public.currencies(code),
  default_locale      text not null default 'es'
                        check (default_locale in ('es', 'en', 'pt', 'it', 'fr', 'de')),
  is_active           boolean not null default true,
  subscription_status text not null default 'trial'
                        check (subscription_status in ('trial', 'active', 'suspended', 'cancelled')),
  is_demo             boolean not null default false,
  demo_expires_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint demo_expiry_required check (not is_demo or demo_expires_at is not null)
);

create index salons_currency_idx on public.salons(currency);

alter table public.salons enable row level security;

create trigger set_updated_at
  before update on public.salons
  for each row execute function public.set_updated_at();

-- profiles -------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  avatar_url text,
  phone      text,
  locale     text not null default 'es'
               check (locale in ('es', 'en', 'pt', 'it', 'fr', 'de')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- memberships -------------------------------------------------------------------
-- Una persona puede tener varias filas (cadena de salones). Selector de salón
-- activo en el header del panel se construye en Fase 10.
create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  salon_id   uuid not null references public.salons(id) on delete cascade,
  role       text not null check (role in ('owner', 'admin', 'reception')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, salon_id)
);

create index memberships_salon_id_idx on public.memberships(salon_id);
create index memberships_user_id_idx on public.memberships(user_id);

alter table public.memberships enable row level security;

create trigger set_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- Función helper reutilizada por TODAS las tablas de negocio de fases futuras:
-- salon_id in (select public.active_salon_ids()). security definer para evitar
-- recursión de RLS al leer memberships desde las políticas de otras tablas.
create or replace function public.active_salon_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select salon_id from public.memberships
  where user_id = auth.uid() and is_active;
$$;

-- Políticas RLS ----------------------------------------------------------------

-- salons: un usuario del panel solo ve los salones donde tiene membership
-- activa; el SuperAdmin ve todos. Escritura solo SuperAdmin (autoservicio de
-- configuración por la dueña es Fase 10).
create policy "salons_select_member_or_admin"
  on public.salons for select
  using (public.is_platform_admin() or id in (select public.active_salon_ids()));

create policy "salons_admin_write"
  on public.salons for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- profiles: cada usuario ve y edita su propio perfil; el SuperAdmin ve todos.
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_platform_admin());

create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Sin política de insert: la fila se crea automáticamente vía el trigger
-- handle_new_user() (security definer) al registrarse en auth.users.

-- memberships: cada usuario ve sus propias membresías; el SuperAdmin ve todas.
-- Escritura (altas/bajas de equipo) solo SuperAdmin por ahora.
create policy "memberships_select_self_or_admin"
  on public.memberships for select
  using (user_id = auth.uid() or public.is_platform_admin());

create policy "memberships_admin_write"
  on public.memberships for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Auto-creación de profile al registrar un usuario en auth.users --------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'locale', 'es')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
