-- Fase 6: pagos, cuadre de caja diario, gastos y nóminas.
-- Ver CLAUDE.md secciones 6, 7, 9, 11 y 13.
--
-- Fuera de alcance en esta migración (documentado en el plan de la Fase 6):
--   - payments.appointment_id: no se puede crear como FK real porque
--     "appointments" no existe aún (Fase 4); se añadirá junto con esa tabla.
--   - clients.first_visit_at / last_visit_at: dependen de citas reales
--     (Fase 4). total_spent_cents SÍ se completa aquí (ver trigger abajo).

-- payments --------------------------------------------------------------------
create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  salon_id      uuid not null references public.salons(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete restrict,
  amount_cents  integer not null check (amount_cents > 0),
  method        text not null check (method in ('cash','card','transfer','other')),
  status        text not null default 'paid' check (status in ('pending','paid','refunded')),
  reference     text,
  paid_at       timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.payments is
  'Cobros a clientes. Sin appointment_id todavía: se añadirá en la Fase 4 '
  'junto con la tabla appointments. Al marcar/crear un pago como paid (o al '
  'revertirlo a refunded) el trigger apply_payment_to_client mantiene '
  'clients.total_spent_cents actualizado. Sin DELETE: una corrección se hace '
  'cambiando el status, nunca borrando el registro.';

create index idx_payments_salon_id on public.payments (salon_id);
create index idx_payments_salon_client on public.payments (salon_id, client_id);

create or replace function public.check_payment_client_same_salon()
returns trigger
language plpgsql
as $$
declare
  v_client_salon uuid;
begin
  select salon_id into v_client_salon from public.clients where id = new.client_id;

  if v_client_salon is null or v_client_salon <> new.salon_id then
    raise exception 'client_id % no pertenece al salón %', new.client_id, new.salon_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger check_payment_client_same_salon
  before insert or update on public.payments
  for each row execute function public.check_payment_client_same_salon();

create or replace function public.apply_payment_to_client()
returns trigger
language plpgsql
as $$
declare
  v_was_paid boolean;
  v_old_amount integer;
  v_is_paid boolean;
  v_delta integer;
begin
  v_is_paid := new.status = 'paid';

  if tg_op = 'INSERT' then
    v_was_paid := false;
    v_old_amount := 0;
  else
    v_was_paid := old.status = 'paid';
    v_old_amount := old.amount_cents;
  end if;

  v_delta := (case when v_is_paid then new.amount_cents else 0 end)
           - (case when v_was_paid then v_old_amount else 0 end);

  if v_delta <> 0 then
    update public.clients
      set total_spent_cents = total_spent_cents + v_delta
      where id = new.client_id;
  end if;

  return new;
end;
$$;

create trigger apply_payment_to_client
  after insert or update of status, amount_cents on public.payments
  for each row execute function public.apply_payment_to_client();

create trigger set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

create policy payments_select_members
  on public.payments for select to authenticated
  using (salon_id in (select public.active_salon_ids()));

create policy payments_select_platform_admin
  on public.payments for select to authenticated
  using (public.is_platform_admin());

create policy payments_insert_members
  on public.payments for insert to authenticated
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

create policy payments_update_members
  on public.payments for update to authenticated
  using (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  )
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

grant select, insert, update on public.payments to authenticated;

-- cash_closures -----------------------------------------------------------------
create table public.cash_closures (
  id                   uuid primary key default gen_random_uuid(),
  salon_id             uuid not null references public.salons(id) on delete cascade,
  closure_date         date not null,
  opening_cash_cents   integer not null default 0 check (opening_cash_cents >= 0),
  expected_cash_cents  integer not null default 0,
  counted_cash_cents   integer not null default 0 check (counted_cash_cents >= 0),
  difference_cents     integer not null default 0,
  notes                text,
  closed_by            uuid references auth.users(id) on delete set null,
  closed_at            timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (salon_id, closure_date)
);

comment on table public.cash_closures is
  'Cuadre de caja diario, uno por salón y por día. expected_cash_cents se '
  'fija al INSERT (trigger apply_cash_closure_computed) como '
  'opening_cash_cents + Σ payments en efectivo/pagados de ese día en la '
  'zona horaria del salón; difference_cents se recalcula en INSERT y '
  'UPDATE. Ninguno de los dos se acepta desde la aplicación. Sin DELETE.';

create index idx_cash_closures_salon_id on public.cash_closures (salon_id);

create or replace function public.apply_cash_closure_computed()
returns trigger
language plpgsql
as $$
declare
  v_timezone text;
  v_cash_total integer;
begin
  select timezone into v_timezone from public.salons where id = new.salon_id;

  if tg_op = 'INSERT' then
    select coalesce(sum(amount_cents), 0) into v_cash_total
      from public.payments
      where salon_id = new.salon_id
        and method = 'cash'
        and status = 'paid'
        and (paid_at at time zone v_timezone)::date = new.closure_date;

    new.expected_cash_cents := new.opening_cash_cents + v_cash_total;
  end if;

  new.difference_cents := new.counted_cash_cents - new.expected_cash_cents;
  return new;
end;
$$;

create trigger apply_cash_closure_computed
  before insert or update on public.cash_closures
  for each row execute function public.apply_cash_closure_computed();

create trigger set_updated_at
  before update on public.cash_closures
  for each row execute function public.set_updated_at();

alter table public.cash_closures enable row level security;

create policy cash_closures_select_members
  on public.cash_closures for select to authenticated
  using (salon_id in (select public.active_salon_ids()));

create policy cash_closures_select_platform_admin
  on public.cash_closures for select to authenticated
  using (public.is_platform_admin());

create policy cash_closures_insert_members
  on public.cash_closures for insert to authenticated
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

create policy cash_closures_update_members
  on public.cash_closures for update to authenticated
  using (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  )
  with check (
    public.is_platform_admin()
    or salon_id in (select public.active_salon_ids())
  );

grant select, insert, update on public.cash_closures to authenticated;

-- expenses ------------------------------------------------------------------------
create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  salon_id      uuid not null references public.salons(id) on delete cascade,
  category      text not null check (char_length(btrim(category)) > 0),
  description   text,
  amount_cents  integer not null check (amount_cents > 0),
  spent_at      date not null default current_date,
  supplier_id   uuid references public.suppliers(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.expenses is
  'Gastos del salón, independientes de inventario (CLAUDE.md sección 6). '
  'category es texto libre. Solo el owner tiene acceso (sección 7: '
  'Finanzas/Nóminas admin y reception no ven ni escriben nada). Único '
  'módulo de esta fase con DELETE real: sin efectos derivados aguas abajo.';

create index idx_expenses_salon_id on public.expenses (salon_id);

create or replace function public.check_expense_supplier_same_salon()
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

create trigger check_expense_supplier_same_salon
  before insert or update on public.expenses
  for each row execute function public.check_expense_supplier_same_salon();

create trigger set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;

create policy expenses_select_owner
  on public.expenses for select to authenticated
  using (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner']))
  );

create policy expenses_insert_owner
  on public.expenses for insert to authenticated
  with check (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner']))
  );

create policy expenses_update_owner
  on public.expenses for update to authenticated
  using (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner']))
  )
  with check (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner']))
  );

create policy expenses_delete_owner
  on public.expenses for delete to authenticated
  using (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner']))
  );

grant select, insert, update, delete on public.expenses to authenticated;

-- staff_payouts ---------------------------------------------------------------
create table public.staff_payouts (
  id            uuid primary key default gen_random_uuid(),
  salon_id      uuid not null references public.salons(id) on delete cascade,
  staff_id      uuid not null references public.staff(id) on delete restrict,
  period_start  date not null,
  period_end    date not null check (period_end >= period_start),
  base_cents    integer not null default 0 check (base_cents >= 0),
  bonus_cents   integer not null default 0 check (bonus_cents >= 0),
  total_cents   integer not null default 0 check (total_cents >= 0),
  status        text not null default 'pending' check (status in ('pending','paid')),
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.staff_payouts is
  'Nóminas: salario base (copiado de staff.base_salary_cents al crear, '
  'editable) + bono manual. Sin comisiones (CLAUDE.md sección 13). '
  'total_cents siempre se recalcula por trigger (set_payout_total), nunca '
  'se confía en el valor enviado por la aplicación. Solo owner tiene '
  'acceso. Sin DELETE.';

create index idx_staff_payouts_salon_id on public.staff_payouts (salon_id);
create index idx_staff_payouts_staff_id on public.staff_payouts (staff_id);

create or replace function public.check_payout_staff_same_salon()
returns trigger
language plpgsql
as $$
declare
  v_staff_salon uuid;
begin
  select salon_id into v_staff_salon from public.staff where id = new.staff_id;

  if v_staff_salon is null or v_staff_salon <> new.salon_id then
    raise exception 'staff_id % no pertenece al salón %', new.staff_id, new.salon_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger check_payout_staff_same_salon
  before insert or update on public.staff_payouts
  for each row execute function public.check_payout_staff_same_salon();

create or replace function public.set_payout_total()
returns trigger
language plpgsql
as $$
begin
  new.total_cents := new.base_cents + new.bonus_cents;
  return new;
end;
$$;

create trigger set_payout_total
  before insert or update on public.staff_payouts
  for each row execute function public.set_payout_total();

create trigger set_updated_at
  before update on public.staff_payouts
  for each row execute function public.set_updated_at();

alter table public.staff_payouts enable row level security;

create policy staff_payouts_select_owner
  on public.staff_payouts for select to authenticated
  using (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner']))
  );

create policy staff_payouts_insert_owner
  on public.staff_payouts for insert to authenticated
  with check (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner']))
  );

create policy staff_payouts_update_owner
  on public.staff_payouts for update to authenticated
  using (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner']))
  )
  with check (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner']))
  );

grant select, insert, update on public.staff_payouts to authenticated;
