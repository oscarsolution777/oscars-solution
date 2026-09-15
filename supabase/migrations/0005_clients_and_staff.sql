-- Fase 5: clientes y trabajadores, más service_staff (qué servicios sabe
-- hacer cada trabajador). Ver CLAUDE.md secciones 6, 7, 9 y 11.

-- clients ---------------------------------------------------------------------
create table public.clients (
  id                 uuid primary key default gen_random_uuid(),
  salon_id           uuid not null references public.salons(id) on delete cascade,
  full_name          text not null check (char_length(btrim(full_name)) > 0),
  phone              text not null check (char_length(btrim(phone)) > 0),
  email              text,
  notes              text,
  preferences        jsonb not null default '[]'::jsonb,
  first_visit_at     timestamptz,
  last_visit_at      timestamptz,
  total_spent_cents  integer not null default 0 check (total_spent_cents >= 0),
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.clients is
  'Clientes del salón. Sin user_id: el cliente nunca tiene cuenta ni login '
  '(siempre anónimo en el portal). first_visit_at/last_visit_at/total_spent_cents '
  'se completan automáticamente en Fases 4/6; aquí empiezan vacíos. '
  'Borrado lógico vía is_active=false, nunca DELETE.';

create index idx_clients_salon_id on public.clients (salon_id);
create index idx_clients_salon_active on public.clients (salon_id, is_active);

create trigger set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

create policy clients_select_members
  on public.clients for select to authenticated
  using (salon_id in (select public.active_salon_ids()));

create policy clients_select_platform_admin
  on public.clients for select to authenticated
  using (public.is_platform_admin());

create policy clients_insert_members
  on public.clients for insert to authenticated
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

create policy clients_update_members
  on public.clients for update to authenticated
  using (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  )
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

grant select, insert, update on public.clients to authenticated;

-- staff -------------------------------------------------------------------------
create table public.staff (
  id                uuid primary key default gen_random_uuid(),
  salon_id          uuid not null references public.salons(id) on delete cascade,
  user_id           uuid references auth.users(id) on delete set null,
  full_name         text not null check (char_length(btrim(full_name)) > 0),
  phone             text,
  role_title        text not null check (char_length(btrim(role_title)) > 0),
  base_salary_cents integer not null default 0 check (base_salary_cents >= 0),
  hired_at          date not null default current_date,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.staff is
  'Trabajadores del salón. user_id siempre null por ahora (no inician sesión). '
  'Sin comisiones (CLAUDE.md sección 13): base_salary_cents es el único monto '
  'fijo aquí; bonos manuales viven en staff_payouts (Fase 6). '
  'Borrado lógico vía is_active=false, nunca DELETE.';

create index idx_staff_salon_id on public.staff (salon_id);
create index idx_staff_salon_active on public.staff (salon_id, is_active);

create trigger set_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

alter table public.staff enable row level security;

create policy staff_select_members
  on public.staff for select to authenticated
  using (salon_id in (select public.active_salon_ids()));

create policy staff_select_platform_admin
  on public.staff for select to authenticated
  using (public.is_platform_admin());

create policy staff_insert_owner_admin
  on public.staff for insert to authenticated
  with check (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner','admin']))
  );

create policy staff_update_owner_admin
  on public.staff for update to authenticated
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

grant select, insert, update on public.staff to authenticated;

-- service_staff (catálogo: qué servicios sabe hacer cada trabajador) ------------
create table public.service_staff (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.services(id) on delete cascade,
  staff_id    uuid not null references public.staff(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (service_id, staff_id)
);

comment on table public.service_staff is
  'Qué trabajador puede realizar qué servicio. Sin salon_id propio: se valida '
  'por trigger que service_id y staff_id pertenezcan al mismo salón.';

create index idx_service_staff_service_id on public.service_staff (service_id);
create index idx_service_staff_staff_id on public.service_staff (staff_id);

create or replace function public.check_service_staff_same_salon()
returns trigger
language plpgsql
as $$
declare
  v_service_salon uuid;
  v_staff_salon uuid;
begin
  select salon_id into v_service_salon from public.services where id = new.service_id;
  select salon_id into v_staff_salon from public.staff where id = new.staff_id;

  if v_service_salon is null or v_staff_salon is null or v_service_salon <> v_staff_salon then
    raise exception 'service_id % y staff_id % no pertenecen al mismo salón', new.service_id, new.staff_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger check_service_staff_same_salon
  before insert on public.service_staff
  for each row execute function public.check_service_staff_same_salon();

alter table public.service_staff enable row level security;

create policy service_staff_select_members
  on public.service_staff for select to authenticated
  using (
    exists (
      select 1 from public.staff s
      where s.id = service_staff.staff_id
        and s.salon_id in (select public.active_salon_ids())
    )
  );

create policy service_staff_select_platform_admin
  on public.service_staff for select to authenticated
  using (public.is_platform_admin());

create policy service_staff_insert_owner_admin
  on public.service_staff for insert to authenticated
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.staff s
      where s.id = service_staff.staff_id
        and public.has_role_in_salon(s.salon_id, array['owner','admin'])
    )
  );

create policy service_staff_delete_owner_admin
  on public.service_staff for delete to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.staff s
      where s.id = service_staff.staff_id
        and public.has_role_in_salon(s.salon_id, array['owner','admin'])
    )
  );

grant select, insert, delete on public.service_staff to authenticated;
