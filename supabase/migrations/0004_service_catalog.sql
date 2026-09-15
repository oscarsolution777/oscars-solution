-- Fase 1: catálogo de servicios (categorías + servicios), con RLS por rol y
-- bucket de Storage para imágenes. Ver CLAUDE.md secciones 6, 7 y 11.

-- Helper reutilizable de autorización por rol dentro de un salón. Mismo
-- patrón que active_salon_ids()/is_platform_admin() (0003): security definer
-- para evitar recursión de RLS al leer memberships desde otras políticas.
create or replace function public.has_role_in_salon(
  target_salon_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.salon_id = target_salon_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role::text = any(allowed_roles)
  );
$$;

grant execute on function public.has_role_in_salon(uuid, text[]) to authenticated;

comment on function public.has_role_in_salon(uuid, text[]) is
  'True si auth.uid() tiene membership activa en target_salon_id con role en allowed_roles.';

-- service_categories ---------------------------------------------------------
create table public.service_categories (
  id          uuid primary key default gen_random_uuid(),
  salon_id    uuid not null references public.salons(id) on delete cascade,
  name        text not null check (char_length(btrim(name)) > 0),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.service_categories is
  'Categorías de servicios por salón. Borrado lógico vía is_active=false, nunca DELETE.';

create index idx_service_categories_salon_id on public.service_categories (salon_id);
create index idx_service_categories_salon_sort on public.service_categories (salon_id, sort_order);

create unique index uq_service_categories_salon_name_active
  on public.service_categories (salon_id, lower(btrim(name)))
  where is_active = true;

create trigger set_updated_at
  before update on public.service_categories
  for each row execute function public.set_updated_at();

-- services -------------------------------------------------------------------
create table public.services (
  id            uuid primary key default gen_random_uuid(),
  salon_id      uuid not null references public.salons(id) on delete cascade,
  category_id   uuid not null references public.service_categories(id) on delete restrict,
  name          text not null check (char_length(btrim(name)) > 0),
  description   text,
  features      text[] not null default '{}'::text[],
  price_cents   integer not null default 0 check (price_cents >= 0),
  duration_min  integer not null check (duration_min > 0),
  image_url     text,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.services is
  'Servicios del salón. price_cents siempre entero; formatear solo en presentación. '
  'duration_min es informativo, no bloquea agenda. Borrado lógico vía is_active=false.';

create index idx_services_salon_id on public.services (salon_id);
create index idx_services_category_id on public.services (category_id);
create index idx_services_salon_active on public.services (salon_id, is_active);
create index idx_services_salon_sort on public.services (salon_id, sort_order);

create trigger set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- Defensa: category_id debe pertenecer al mismo salon_id que el servicio.
create or replace function public.check_service_category_salon()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.service_categories c
    where c.id = new.category_id and c.salon_id = new.salon_id
  ) then
    raise exception 'category_id % no pertenece al salon_id %', new.category_id, new.salon_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger check_service_category_salon
  before insert or update of category_id, salon_id on public.services
  for each row execute function public.check_service_category_salon();

-- RLS: service_categories ------------------------------------------------------
alter table public.service_categories enable row level security;

create policy service_categories_select_members
  on public.service_categories for select to authenticated
  using (salon_id in (select public.active_salon_ids()));

create policy service_categories_select_platform_admin
  on public.service_categories for select to authenticated
  using (public.is_platform_admin());

create policy service_categories_select_anon
  on public.service_categories for select to anon
  using (is_active = true);

create policy service_categories_insert_owner_admin
  on public.service_categories for insert to authenticated
  with check (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner','admin']))
  );

create policy service_categories_update_owner_admin
  on public.service_categories for update to authenticated
  using (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner','admin']))
  )
  with check (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner','admin']))
  );

-- RLS: services ------------------------------------------------------------------
alter table public.services enable row level security;

create policy services_select_members
  on public.services for select to authenticated
  using (salon_id in (select public.active_salon_ids()));

create policy services_select_platform_admin
  on public.services for select to authenticated
  using (public.is_platform_admin());

create policy services_select_anon
  on public.services for select to anon
  using (
    is_active = true
    and exists (
      select 1 from public.service_categories c
      where c.id = services.category_id
        and c.salon_id = services.salon_id
        and c.is_active = true
    )
  );

create policy services_insert_owner_admin
  on public.services for insert to authenticated
  with check (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner','admin']))
  );

create policy services_update_owner_admin
  on public.services for update to authenticated
  using (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner','admin']))
  )
  with check (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner','admin']))
  );

grant select on public.service_categories to anon, authenticated;
grant insert, update on public.service_categories to authenticated;
grant select on public.services to anon, authenticated;
grant insert, update on public.services to authenticated;

-- Storage: bucket público de imágenes de servicios ------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('service-images', 'service-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy service_images_public_read
  on storage.objects for select to public
  using (bucket_id = 'service-images');

-- Convención de ruta: <salon_id>/<uuid>.<ext>
create policy service_images_owner_admin_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'service-images'
    and public.has_role_in_salon((storage.foldername(name))[1]::uuid, array['owner','admin'])
  );

create policy service_images_owner_admin_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'service-images'
    and public.has_role_in_salon((storage.foldername(name))[1]::uuid, array['owner','admin'])
  )
  with check (
    bucket_id = 'service-images'
    and public.has_role_in_salon((storage.foldername(name))[1]::uuid, array['owner','admin'])
  );

create policy service_images_owner_admin_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'service-images'
    and public.has_role_in_salon((storage.foldername(name))[1]::uuid, array['owner','admin'])
  );

create policy service_images_platform_admin_all
  on storage.objects for all to authenticated
  using (bucket_id = 'service-images' and public.is_platform_admin())
  with check (bucket_id = 'service-images' and public.is_platform_admin());
