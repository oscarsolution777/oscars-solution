-- Fase 7: inventario (proveedores, productos y movimientos de stock).
-- Ver CLAUDE.md secciones 6, 7, 9 y 11.
--
-- Fuera de alcance en esta migración (documentado en el plan de la Fase 7):
--   - service_products y el descuento automático de stock al completar una
--     cita: dependen de "appointments" (Fase 4, no construida todavía).
--   - stock_movements.appointment_id: no se puede crear como FK real porque
--     "appointments" no existe aún; se añadirá junto con esa tabla.

-- suppliers ---------------------------------------------------------------
create table public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  salon_id    uuid not null references public.salons(id) on delete cascade,
  name        text not null check (char_length(btrim(name)) > 0),
  phone       text,
  email       text,
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.suppliers is
  'Proveedores del salón. is_active añadido sobre la sección 6 de CLAUDE.md: '
  'un proveedor con productos históricos no debe borrarse (rompería la '
  'trazabilidad de products.supplier_id), se desactiva en su lugar, igual '
  'que el resto del catálogo. Borrado lógico vía is_active=false, nunca DELETE.';

create index idx_suppliers_salon_id on public.suppliers (salon_id);
create index idx_suppliers_salon_active on public.suppliers (salon_id, is_active);

create trigger set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

alter table public.suppliers enable row level security;

create policy suppliers_select_members
  on public.suppliers for select to authenticated
  using (salon_id in (select public.active_salon_ids()));

create policy suppliers_select_platform_admin
  on public.suppliers for select to authenticated
  using (public.is_platform_admin());

create policy suppliers_insert_members
  on public.suppliers for insert to authenticated
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

create policy suppliers_update_members
  on public.suppliers for update to authenticated
  using (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  )
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

grant select, insert, update on public.suppliers to authenticated;

-- products ------------------------------------------------------------------
create table public.products (
  id            uuid primary key default gen_random_uuid(),
  salon_id      uuid not null references public.salons(id) on delete cascade,
  supplier_id   uuid references public.suppliers(id) on delete set null,
  name          text not null check (char_length(btrim(name)) > 0),
  sku           text,
  unit          text not null check (unit in ('ml','g','unit')),
  stock_qty     integer not null default 0 check (stock_qty >= 0),
  min_stock     integer not null default 0 check (min_stock >= 0),
  cost_cents    integer not null default 0 check (cost_cents >= 0),
  price_cents   integer not null default 0 check (price_cents >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.products is
  'Productos de inventario del salón. stock_qty se modifica únicamente a '
  'través de stock_movements (trigger apply_stock_movement), nunca por '
  'UPDATE directo desde la aplicación. Borrado lógico vía is_active=false.';

create index idx_products_salon_id on public.products (salon_id);
create index idx_products_salon_active on public.products (salon_id, is_active);
create index idx_products_supplier_id on public.products (supplier_id);

create or replace function public.check_product_supplier_same_salon()
returns trigger
language plpgsql
as $$
declare
  v_supplier_salon uuid;
begin
  if new.supplier_id is null then
    return new;
  end if;

  select salon_id into v_supplier_salon from public.suppliers where id = new.supplier_id;

  if v_supplier_salon is null or v_supplier_salon <> new.salon_id then
    raise exception 'supplier_id % no pertenece al salón %', new.supplier_id, new.salon_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger check_product_supplier_same_salon
  before insert or update on public.products
  for each row execute function public.check_product_supplier_same_salon();

create trigger set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

create policy products_select_members
  on public.products for select to authenticated
  using (salon_id in (select public.active_salon_ids()));

create policy products_select_platform_admin
  on public.products for select to authenticated
  using (public.is_platform_admin());

create policy products_insert_members
  on public.products for insert to authenticated
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

create policy products_update_members
  on public.products for update to authenticated
  using (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  )
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

grant select, insert, update on public.products to authenticated;

-- stock_movements -------------------------------------------------------------
create table public.stock_movements (
  id          uuid primary key default gen_random_uuid(),
  salon_id    uuid not null references public.salons(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  type        text not null check (type in ('in','out','adjustment','loss')),
  qty         integer not null check (
                (type in ('in','out','loss') and qty > 0) or
                (type = 'adjustment' and qty <> 0)
              ),
  reason      text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.stock_movements is
  'Ledger inmutable de movimientos de stock (sin appointment_id todavía: '
  'se añadirá en la Fase 4 junto con la tabla appointments, para el '
  'descuento automático al completar una cita). Solo SELECT/INSERT, nunca '
  'UPDATE/DELETE — una corrección se registra como un movimiento nuevo de '
  'tipo adjustment. stock_qty de products se actualiza vía el trigger '
  'apply_stock_movement, nunca manualmente.';

create index idx_stock_movements_salon_id on public.stock_movements (salon_id);
create index idx_stock_movements_product_id on public.stock_movements (product_id, created_at desc);

create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
as $$
declare
  v_product_salon uuid;
  v_current_qty integer;
  v_delta integer;
  v_new_qty integer;
begin
  select salon_id, stock_qty into v_product_salon, v_current_qty
    from public.products where id = new.product_id for update;

  if v_product_salon is null or v_product_salon <> new.salon_id then
    raise exception 'product_id % no pertenece al salón %', new.product_id, new.salon_id
      using errcode = '23514';
  end if;

  v_delta := case
    when new.type = 'in' then new.qty
    when new.type in ('out', 'loss') then -new.qty
    else new.qty -- adjustment: delta con signo
  end;

  v_new_qty := v_current_qty + v_delta;
  if v_new_qty < 0 then
    raise exception 'El movimiento dejaría stock negativo (actual: %, delta: %)', v_current_qty, v_delta
      using errcode = '23514';
  end if;

  update public.products set stock_qty = v_new_qty where id = new.product_id;
  return new;
end;
$$;

create trigger apply_stock_movement
  before insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

alter table public.stock_movements enable row level security;

create policy stock_movements_select_members
  on public.stock_movements for select to authenticated
  using (salon_id in (select public.active_salon_ids()));

create policy stock_movements_select_platform_admin
  on public.stock_movements for select to authenticated
  using (public.is_platform_admin());

create policy stock_movements_insert_members
  on public.stock_movements for insert to authenticated
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

-- Sin policies de update/delete: ledger inmutable, ni siquiera para
-- platform_admin.

grant select, insert on public.stock_movements to authenticated;
