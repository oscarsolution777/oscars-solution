-- Herramienta "Reiniciar salón" (Panel SuperAdmin): borrado destructivo de
-- toda la actividad operativa/financiera de un salón, conservando su
-- catálogo/personal/productos/proveedores intactos. Pensada sobre todo para
-- reciclar un salón de demo entre prospectos (CLAUDE.md sección 1, "Demo
-- comercial reutilizable") sin tener que recrearlo desde cero, y también
-- disponible para un salón real si Oscar necesita dejarlo en blanco.
--
-- Alcance confirmado con el usuario: se borra TODO el histórico de
-- solicitudes/citas/dinero/inventario -- no solo lo "de cliente". Se
-- conservan service_categories/services/service_staff/service_products/
-- staff/products/suppliers.
--
-- Orden de borrado verificado contra las FK reales de las migraciones 0005-
-- 0008: payments.client_id y appointments.client_id son "on delete restrict"
-- -> clients va al final. request_items/appointment_items no se tocan
-- explícitamente: caen solos por "on delete cascade" al borrar
-- requests/appointments. expenses/staff_payouts/stock_movements/
-- cash_closures no tienen FK entre sí que impongan un orden.

create or replace function public.get_salon_reset_preview(p_salon_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_platform_admin() then
    jsonb_build_object('ok', false, 'error', 'forbidden')
  else
    jsonb_build_object(
      'ok', true,
      'counts', jsonb_build_object(
        'requests', (select count(*) from public.requests where salon_id = p_salon_id),
        'appointments', (select count(*) from public.appointments where salon_id = p_salon_id),
        'payments', (select count(*) from public.payments where salon_id = p_salon_id),
        'cash_closures', (select count(*) from public.cash_closures where salon_id = p_salon_id),
        'stock_movements', (select count(*) from public.stock_movements where salon_id = p_salon_id),
        'expenses', (select count(*) from public.expenses where salon_id = p_salon_id),
        'staff_payouts', (select count(*) from public.staff_payouts where salon_id = p_salon_id),
        'clients', (select count(*) from public.clients where salon_id = p_salon_id)
      )
    )
  end;
$$;

grant execute on function public.get_salon_reset_preview(uuid) to authenticated;

create or replace function public.reset_salon_data(p_salon_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted jsonb;
  v_payments int;
  v_stock_movements int;
  v_cash_closures int;
  v_expenses int;
  v_staff_payouts int;
  v_appointments int;
  v_requests int;
  v_clients int;
  v_ai_analyses int;
begin
  if not public.is_platform_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if not exists (select 1 from public.salons where id = p_salon_id) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- 1. payments (restrict sobre clients -> antes de clients)
  with deleted as (
    delete from public.payments where salon_id = p_salon_id returning 1
  )
  select count(*) into v_payments from deleted;

  -- 2. stock_movements (ledger, sin dependientes)
  with deleted as (
    delete from public.stock_movements where salon_id = p_salon_id returning 1
  )
  select count(*) into v_stock_movements from deleted;

  -- 3. cash_closures
  with deleted as (
    delete from public.cash_closures where salon_id = p_salon_id returning 1
  )
  select count(*) into v_cash_closures from deleted;

  -- 4. expenses (Finanzas)
  with deleted as (
    delete from public.expenses where salon_id = p_salon_id returning 1
  )
  select count(*) into v_expenses from deleted;

  -- 5. staff_payouts (Finanzas; staff_id es restrict pero staff no se toca)
  with deleted as (
    delete from public.staff_payouts where salon_id = p_salon_id returning 1
  )
  select count(*) into v_staff_payouts from deleted;

  -- 6. appointments (restrict sobre clients -> antes de clients; arrastra
  --    appointment_items por cascade)
  with deleted as (
    delete from public.appointments where salon_id = p_salon_id returning 1
  )
  select count(*) into v_appointments from deleted;

  -- 7. requests (arrastra request_items por cascade)
  with deleted as (
    delete from public.requests where salon_id = p_salon_id returning 1
  )
  select count(*) into v_requests from deleted;

  -- 8. clients (al final: ya no queda ningún payment/appointment que lo
  --    bloquee con "on delete restrict")
  with deleted as (
    delete from public.clients where salon_id = p_salon_id returning 1
  )
  select count(*) into v_clients from deleted;

  -- 9. caché de IA: queda obsoleta al borrar el histórico que la alimentó
  with deleted as (
    delete from public.ai_analyses where salon_id = p_salon_id returning 1
  )
  select count(*) into v_ai_analyses from deleted;

  v_deleted := jsonb_build_object(
    'requests', v_requests,
    'appointments', v_appointments,
    'payments', v_payments,
    'cash_closures', v_cash_closures,
    'stock_movements', v_stock_movements,
    'expenses', v_expenses,
    'staff_payouts', v_staff_payouts,
    'clients', v_clients,
    'ai_analyses', v_ai_analyses
  );

  return jsonb_build_object('ok', true, 'deleted', v_deleted);
end;
$$;

grant execute on function public.reset_salon_data(uuid) to authenticated;
