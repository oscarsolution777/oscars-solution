-- Fase 4: solicitudes y citas (panel), más service_products (consumo de
-- inventario por servicio) y las columnas retroactivas que las Fases 6/7
-- dejaron pendientes. Ver CLAUDE.md secciones 6, 7, 9, 11 y 13.
--
-- Alcance (documentado en el plan de la Fase 4): las Fases 2 (Portal QR) y 3
-- (cancelar/reprogramar sin cuenta) siguen pausadas por instrucción del
-- usuario. Esta migración construye el flujo completo del lado del panel:
-- la solicitud se crea manualmente (source='manual'), se confirma o
-- rechaza, y de ahí nace la cita. public_code se genera igualmente (la
-- tabla lo exige not null) para dejar el dato listo para cuando exista el
-- portal, pero no se construye ninguna ruta pública en esta fase.

-- service_products (consumo de inventario por servicio) -----------------------
create table public.service_products (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.services(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete restrict,
  qty         integer not null check (qty > 0),
  created_at  timestamptz not null default now(),
  unique (service_id, product_id)
);

comment on table public.service_products is
  'Consumo estándar de inventario por servicio (CLAUDE.md sección 6). Sin '
  'salon_id propio: se valida por trigger que service_id y product_id '
  'pertenezcan al mismo salón. Usado por apply_appointment_completion para '
  'descontar stock automáticamente al completar una cita.';

create index idx_service_products_service_id on public.service_products (service_id);
create index idx_service_products_product_id on public.service_products (product_id);

create or replace function public.check_service_product_same_salon()
returns trigger
language plpgsql
as $$
declare
  v_service_salon uuid;
  v_product_salon uuid;
begin
  select salon_id into v_service_salon from public.services where id = new.service_id;
  select salon_id into v_product_salon from public.products where id = new.product_id;

  if v_service_salon is null or v_product_salon is null or v_service_salon <> v_product_salon then
    raise exception 'service_id % y product_id % no pertenecen al mismo salón', new.service_id, new.product_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger check_service_product_same_salon
  before insert on public.service_products
  for each row execute function public.check_service_product_same_salon();

alter table public.service_products enable row level security;

-- Mismo patrón de permisos que "Servicios" (owner/admin escritura, reception
-- lectura) — CLAUDE.md sección 7, fila "Servicios".
create policy service_products_select_members
  on public.service_products for select to authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = service_products.service_id
        and s.salon_id in (select public.active_salon_ids())
    )
  );

create policy service_products_select_platform_admin
  on public.service_products for select to authenticated
  using (public.is_platform_admin());

create policy service_products_insert_owner_admin
  on public.service_products for insert to authenticated
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.services s
      where s.id = service_products.service_id
        and public.has_role_in_salon(s.salon_id, array['owner','admin'])
    )
  );

create policy service_products_delete_owner_admin
  on public.service_products for delete to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.services s
      where s.id = service_products.service_id
        and public.has_role_in_salon(s.salon_id, array['owner','admin'])
    )
  );

grant select, insert, delete on public.service_products to authenticated;

-- requests ----------------------------------------------------------------------
create table public.requests (
  id             uuid primary key default gen_random_uuid(),
  salon_id       uuid not null references public.salons(id) on delete cascade,
  public_code    text not null unique,
  client_id      uuid references public.clients(id) on delete set null,
  client_name    text not null check (char_length(btrim(client_name)) > 0),
  client_phone   text,
  client_email   text,
  preferred_date date,
  status         text not null default 'pending' check (status in ('pending','confirmed','rejected','cancelled')),
  source         text not null default 'manual' check (source in ('qr','manual')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.requests is
  'Solicitud entrante (CLAUDE.md sección 6). public_code se genera siempre '
  'server-side (trigger set_request_public_code), aunque en esta fase solo '
  'se crean con source=manual desde el panel — el portal QR es la Fase 2, '
  'todavía pausada. Sin DELETE: una corrección se hace cambiando el status.';

create index idx_requests_salon_id on public.requests (salon_id);
create index idx_requests_salon_status on public.requests (salon_id, status);

create or replace function public.set_request_public_code()
returns trigger
language plpgsql
as $$
begin
  if new.public_code is null or btrim(new.public_code) = '' then
    new.public_code := encode(gen_random_bytes(12), 'hex');
  end if;
  return new;
end;
$$;

create trigger set_request_public_code
  before insert on public.requests
  for each row execute function public.set_request_public_code();

create or replace function public.check_request_client_same_salon()
returns trigger
language plpgsql
as $$
declare
  v_client_salon uuid;
begin
  if new.client_id is null then
    return new;
  end if;

  select salon_id into v_client_salon from public.clients where id = new.client_id;

  if v_client_salon is null or v_client_salon <> new.salon_id then
    raise exception 'client_id % no pertenece al salón %', new.client_id, new.salon_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger check_request_client_same_salon
  before insert or update on public.requests
  for each row execute function public.check_request_client_same_salon();

create trigger set_updated_at
  before update on public.requests
  for each row execute function public.set_updated_at();

alter table public.requests enable row level security;

-- Patrón simple: los 3 roles tienen acceso completo (CLAUDE.md sección 7,
-- fila "Solicitudes / Citas: owner ✅ admin ✅ reception ✅").
create policy requests_select_members
  on public.requests for select to authenticated
  using (salon_id in (select public.active_salon_ids()));

create policy requests_select_platform_admin
  on public.requests for select to authenticated
  using (public.is_platform_admin());

create policy requests_insert_members
  on public.requests for insert to authenticated
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

create policy requests_update_members
  on public.requests for update to authenticated
  using (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  )
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

grant select, insert, update on public.requests to authenticated;

-- request_items -------------------------------------------------------------------
create table public.request_items (
  id                    uuid primary key default gen_random_uuid(),
  request_id            uuid not null references public.requests(id) on delete cascade,
  service_id            uuid not null references public.services(id) on delete restrict,
  staff_id              uuid references public.staff(id) on delete set null,
  service_name_snapshot text not null,
  price_cents_snapshot  integer not null check (price_cents_snapshot >= 0),
  created_at            timestamptz not null default now()
);

comment on table public.request_items is
  'Servicios pedidos en una solicitud. service_name_snapshot/price_cents_snapshot '
  'los fija siempre el trigger snapshot_request_item leyendo services en ese '
  'momento — nunca se confía en lo que envíe la aplicación (mismo principio '
  'que las columnas derivadas de Fases 6/7). staff_id es opcional: la dueña '
  'puede no saber aún quién atenderá. Sin salon_id propio (se deriva vía '
  'request_id). Sin DELETE.';

create index idx_request_items_request_id on public.request_items (request_id);

create or replace function public.snapshot_request_item()
returns trigger
language plpgsql
as $$
declare
  v_service_salon uuid;
  v_request_salon uuid;
  v_staff_salon uuid;
begin
  select salon_id, name, price_cents into v_service_salon, new.service_name_snapshot, new.price_cents_snapshot
    from public.services where id = new.service_id;

  select salon_id into v_request_salon from public.requests where id = new.request_id;

  if v_service_salon is null or v_request_salon is null or v_service_salon <> v_request_salon then
    raise exception 'service_id % no pertenece al salón de la solicitud %', new.service_id, new.request_id
      using errcode = '23514';
  end if;

  if new.staff_id is not null then
    select salon_id into v_staff_salon from public.staff where id = new.staff_id;
    if v_staff_salon is null or v_staff_salon <> v_request_salon then
      raise exception 'staff_id % no pertenece al salón de la solicitud %', new.staff_id, new.request_id
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger snapshot_request_item
  before insert on public.request_items
  for each row execute function public.snapshot_request_item();

alter table public.request_items enable row level security;

create policy request_items_select_members
  on public.request_items for select to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.id = request_items.request_id
        and r.salon_id in (select public.active_salon_ids())
    )
  );

create policy request_items_select_platform_admin
  on public.request_items for select to authenticated
  using (public.is_platform_admin());

create policy request_items_insert_members
  on public.request_items for insert to authenticated
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.requests r
      where r.id = request_items.request_id
        and r.salon_id in (select public.active_salon_ids())
    )
  );

create policy request_items_update_members
  on public.request_items for update to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.requests r
      where r.id = request_items.request_id
        and r.salon_id in (select public.active_salon_ids())
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.requests r
      where r.id = request_items.request_id
        and r.salon_id in (select public.active_salon_ids())
    )
  );

grant select, insert, update on public.request_items to authenticated;

-- appointments ------------------------------------------------------------------
create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  salon_id         uuid not null references public.salons(id) on delete cascade,
  request_id       uuid references public.requests(id) on delete set null,
  client_id        uuid not null references public.clients(id) on delete restrict,
  appointment_date date not null,
  total_cents      integer not null default 0 check (total_cents >= 0),
  notes            text,
  status           text not null default 'scheduled' check (status in ('scheduled','completed','no_show','cancelled')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.appointments is
  'Cita creada al confirmar una solicitud (CLAUDE.md sección 6). Sin hora, '
  'solo fecha. total_cents siempre lo recalcula el trigger '
  'set_appointment_total sumando appointment_items, nunca se confía en el '
  'valor enviado por la aplicación. Al pasar a completed, el trigger '
  'apply_appointment_completion descuenta stock (vía service_products) y '
  'actualiza clients.first_visit_at/last_visit_at. Sin DELETE: las '
  'correcciones son vía status (cancelled/no_show).';

create index idx_appointments_salon_id on public.appointments (salon_id);
create index idx_appointments_salon_date on public.appointments (salon_id, appointment_date);
create index idx_appointments_client_id on public.appointments (client_id);

create or replace function public.check_appointment_client_same_salon()
returns trigger
language plpgsql
as $$
declare
  v_client_salon uuid;
  v_request_salon uuid;
begin
  select salon_id into v_client_salon from public.clients where id = new.client_id;

  if v_client_salon is null or v_client_salon <> new.salon_id then
    raise exception 'client_id % no pertenece al salón %', new.client_id, new.salon_id
      using errcode = '23514';
  end if;

  if new.request_id is not null then
    select salon_id into v_request_salon from public.requests where id = new.request_id;
    if v_request_salon is null or v_request_salon <> new.salon_id then
      raise exception 'request_id % no pertenece al salón %', new.request_id, new.salon_id
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger check_appointment_client_same_salon
  before insert or update on public.appointments
  for each row execute function public.check_appointment_client_same_salon();

create trigger set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

alter table public.appointments enable row level security;

create policy appointments_select_members
  on public.appointments for select to authenticated
  using (salon_id in (select public.active_salon_ids()));

create policy appointments_select_platform_admin
  on public.appointments for select to authenticated
  using (public.is_platform_admin());

create policy appointments_insert_members
  on public.appointments for insert to authenticated
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

create policy appointments_update_members
  on public.appointments for update to authenticated
  using (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  )
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

grant select, insert, update on public.appointments to authenticated;

-- appointment_items ---------------------------------------------------------------
create table public.appointment_items (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id     uuid not null references public.services(id) on delete restrict,
  staff_id       uuid not null references public.staff(id) on delete restrict,
  price_cents    integer not null check (price_cents >= 0),
  created_at     timestamptz not null default now()
);

comment on table public.appointment_items is
  'Servicios de una cita, con el trabajador ya asignado (obligatorio: se '
  'fija al confirmar la solicitud). price_cents lo fija siempre el trigger '
  'snapshot_appointment_item leyendo services en ese momento. Sin salon_id '
  'propio (se deriva vía appointment_id). Sin DELETE.';

create index idx_appointment_items_appointment_id on public.appointment_items (appointment_id);

create or replace function public.snapshot_appointment_item()
returns trigger
language plpgsql
as $$
declare
  v_service_salon uuid;
  v_appointment_salon uuid;
  v_staff_salon uuid;
begin
  select salon_id, price_cents into v_service_salon, new.price_cents
    from public.services where id = new.service_id;

  select salon_id into v_appointment_salon from public.appointments where id = new.appointment_id;

  if v_service_salon is null or v_appointment_salon is null or v_service_salon <> v_appointment_salon then
    raise exception 'service_id % no pertenece al salón de la cita %', new.service_id, new.appointment_id
      using errcode = '23514';
  end if;

  select salon_id into v_staff_salon from public.staff where id = new.staff_id;
  if v_staff_salon is null or v_staff_salon <> v_appointment_salon then
    raise exception 'staff_id % no pertenece al salón de la cita %', new.staff_id, new.appointment_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger snapshot_appointment_item
  before insert on public.appointment_items
  for each row execute function public.snapshot_appointment_item();

create or replace function public.set_appointment_total()
returns trigger
language plpgsql
as $$
declare
  v_appointment_id uuid;
  v_total integer;
begin
  v_appointment_id := coalesce(new.appointment_id, old.appointment_id);

  select coalesce(sum(price_cents), 0) into v_total
    from public.appointment_items
    where appointment_id = v_appointment_id;

  update public.appointments set total_cents = v_total where id = v_appointment_id;

  return coalesce(new, old);
end;
$$;

create trigger set_appointment_total
  after insert or update or delete on public.appointment_items
  for each row execute function public.set_appointment_total();

alter table public.appointment_items enable row level security;

create policy appointment_items_select_members
  on public.appointment_items for select to authenticated
  using (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_items.appointment_id
        and a.salon_id in (select public.active_salon_ids())
    )
  );

create policy appointment_items_select_platform_admin
  on public.appointment_items for select to authenticated
  using (public.is_platform_admin());

create policy appointment_items_insert_members
  on public.appointment_items for insert to authenticated
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.appointments a
      where a.id = appointment_items.appointment_id
        and a.salon_id in (select public.active_salon_ids())
    )
  );

create policy appointment_items_update_members
  on public.appointment_items for update to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.appointments a
      where a.id = appointment_items.appointment_id
        and a.salon_id in (select public.active_salon_ids())
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.appointments a
      where a.id = appointment_items.appointment_id
        and a.salon_id in (select public.active_salon_ids())
    )
  );

grant select, insert, update on public.appointment_items to authenticated;

-- Columnas retroactivas pendientes de Fases 6/7 ------------------------------------
alter table public.stock_movements
  add column appointment_id uuid references public.appointments(id) on delete set null;

alter table public.payments
  add column appointment_id uuid references public.appointments(id) on delete set null;

create index idx_stock_movements_appointment_id on public.stock_movements (appointment_id);
create index idx_payments_appointment_id on public.payments (appointment_id);

comment on column public.stock_movements.appointment_id is
  'Cita que originó el movimiento (descuento automático al completar). Null '
  'para movimientos manuales (in/adjustment/loss o out registrado a mano).';

comment on column public.payments.appointment_id is
  'Cita a la que corresponde el cobro. Nullable: esta fase solo añade la '
  'columna; la UI de vinculación pago↔cita queda para un pase posterior.';

-- Descuento automático de stock + fechas de visita del cliente ---------------------
create or replace function public.apply_appointment_completion()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'completed' or old.status = 'completed' then
    return new;
  end if;

  insert into public.stock_movements (salon_id, product_id, type, qty, reason, created_by, appointment_id)
  select
    new.salon_id,
    sp.product_id,
    'out',
    sp.qty,
    'Consumo automático por cita completada',
    auth.uid(),
    new.id
  from public.appointment_items ai
  join public.service_products sp on sp.service_id = ai.service_id
  where ai.appointment_id = new.id;

  update public.clients
    set
      first_visit_at = least(coalesce(first_visit_at, new.appointment_date::timestamptz), new.appointment_date::timestamptz),
      last_visit_at = greatest(coalesce(last_visit_at, new.appointment_date::timestamptz), new.appointment_date::timestamptz)
    where id = new.client_id;

  return new;
end;
$$;

create trigger apply_appointment_completion
  after update of status on public.appointments
  for each row execute function public.apply_appointment_completion();
