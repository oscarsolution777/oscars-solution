-- Fase 3: Cancelar / reprogramar sin cuenta. Ver CLAUDE.md secciones 6, 7.4,
-- 8, 11 y 13.
--
-- Mismo patrón que get_request_status (migración 0013): requests/appointments
-- solo tienen políticas RLS de update para `authenticated` (migración 0008),
-- así que la única vía correcta para que un cliente anónimo cancele o pida
-- reprogramación de SU PROPIA solicitud es una función security definer
-- localizada exclusivamente por public_code (la "contraseña de un solo uso"
-- de la sección 6) — nunca se abre update de la tabla completa a anon.

-- cancel_request_by_code ---------------------------------------------------------
-- Cancela la solicitud y, si existe, la cita vinculada (siempre que no haya
-- ocurrido ya). Nunca lanza excepción por un caso de negocio esperado: en su
-- lugar devuelve {"ok":false,"error":"<code>"} (mismo estilo que
-- get_request_status devolviendo null en vez de error).
create or replace function public.cancel_request_by_code(p_public_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
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

grant execute on function public.cancel_request_by_code(text) to anon, authenticated;

comment on function public.cancel_request_by_code(text) is
  'Cancela la solicitud/cita del cliente anónimo, localizada exclusivamente por public_code (Fase 3, CLAUDE.md sección 7.4). No borra nada (regla de datos, sección 6): siempre UPDATE de status.';

-- request_reschedule_by_code ------------------------------------------------------
-- "Pedir cambio de fecha" (CLAUDE.md sección 6/8): crea una solicitud NUEVA de
-- reprogramación (misma naturaleza que una solicitud normal, source='qr') que
-- la dueña confirma como cualquier otra. La solicitud/cita original nunca se
-- toca aquí -- no se reprograma sola automáticamente, para evitar choques que
-- la dueña no vea (decisión cerrada, sección 13).
create or replace function public.request_reschedule_by_code(
  p_public_code text,
  p_preferred_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
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

  -- Los service_id originales podrían haberse desactivado desde entonces.
  -- Esta función bypassa request_items_insert_anon (RLS) por ser security
  -- definer, así que se reimplementa aquí ese mismo criterio.
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

grant execute on function public.request_reschedule_by_code(text, date) to anon, authenticated;

comment on function public.request_reschedule_by_code(text, date) is
  'Crea una solicitud nueva de reprogramación (source=qr) a partir de una solicitud/cita activa, localizada por public_code (Fase 3). La original no se modifica. Sujeta al mismo trigger check_request_rate_limit que cualquier insert de requests.';
