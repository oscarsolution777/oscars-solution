-- Corrige un bug real de la migración 0015, detectado en verificación E2E:
-- `security definer` con `set search_path = public` reemplaza por completo el
-- search_path de la sesión durante la ejecución de la función -- incluyendo
-- cualquier trigger disparado dentro de ella. request_reschedule_by_code
-- inserta en `requests`, lo que dispara `set_request_public_code` (migración
-- 0008), que llama a `gen_random_bytes()` (pgcrypto, instalada en el esquema
-- `extensions` en Supabase) sin calificar el esquema. Con `search_path =
-- public` a secas, `extensions` queda fuera y la función falla con
-- "function gen_random_bytes(integer) does not exist".
--
-- Mismo patrón de higiene de migraciones que 0014: no se reescribe la lógica
-- de 0015 en su archivo original, se corrige aquí con create or replace.
create or replace function public.request_reschedule_by_code(
  p_public_code text,
  p_preferred_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_request public.requests%rowtype;
  v_salon public.salons%rowtype;
  v_new_request public.requests%rowtype;
  v_inactive_count integer;
begin
  select * into v_request from public.requests where public_code = p_public_code;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_request.status not in ('pending', 'confirmed') then
    return jsonb_build_object('ok', false, 'error', 'not_reschedulable');
  end if;

  select * into v_salon from public.salons where id = v_request.salon_id;
  if not found or not v_salon.is_active or v_salon.subscription_status not in ('trial', 'active') then
    return jsonb_build_object('ok', false, 'error', 'salon_unavailable');
  end if;

  select count(*) into v_inactive_count
  from public.request_items ri
  join public.services sv on sv.id = ri.service_id
  where ri.request_id = v_request.id and sv.is_active = false;

  if v_inactive_count > 0 then
    return jsonb_build_object('ok', false, 'error', 'service_unavailable');
  end if;

  insert into public.requests (salon_id, client_id, client_name, client_phone, client_email, preferred_date, source)
  values (v_request.salon_id, null, v_request.client_name, v_request.client_phone, v_request.client_email, p_preferred_date, 'qr')
  returning * into v_new_request;

  insert into public.request_items (request_id, service_id, staff_id)
  select v_new_request.id, ri.service_id, ri.staff_id
  from public.request_items ri
  where ri.request_id = v_request.id;

  return jsonb_build_object('ok', true, 'newPublicCode', v_new_request.public_code);
end;
$$;

-- cancel_request_by_code no dispara ningún insert (solo UPDATE de status),
-- así que no sufre este bug, pero se alinea el search_path por consistencia
-- y para no repetir el mismo error si en el futuro se le añade algún insert.
create or replace function public.cancel_request_by_code(p_public_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_request public.requests%rowtype;
  v_appointment public.appointments%rowtype;
  v_has_appointment boolean := false;
begin
  select * into v_request from public.requests where public_code = p_public_code;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_request.status in ('rejected', 'cancelled') then
    return jsonb_build_object('ok', false, 'error', 'already_inactive');
  end if;

  select * into v_appointment from public.appointments where request_id = v_request.id limit 1;
  v_has_appointment := found;

  if v_has_appointment and v_appointment.status in ('completed', 'no_show') then
    return jsonb_build_object('ok', false, 'error', 'already_happened');
  end if;

  if v_has_appointment and v_appointment.status = 'scheduled' then
    update public.appointments set status = 'cancelled' where id = v_appointment.id;
  end if;

  update public.requests set status = 'cancelled' where id = v_request.id;

  return jsonb_build_object('ok', true);
end;
$$;
