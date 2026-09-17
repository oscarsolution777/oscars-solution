-- Fase 2: Portal QR (anónimo). Ver CLAUDE.md secciones 1, 6, 7, 8, 9 y 11.
--
-- Patrón mixto de acceso público (decidido en el plan de esta fase):
--   - salons/service_categories/services: SELECT directo a `anon` vía política
--     RLS filtrada (service_categories/services ya lo tenían desde la Fase 1;
--     aquí solo se añade la de salons).
--   - staff: columnas sensibles (phone, base_salary_cents, hired_at) -> nunca
--     se abre la tabla a `anon`. Se expone solo id+full_name vía función
--     security definer.
--   - requests/request_items: solo INSERT a `anon` (acotado), nunca SELECT de
--     tabla completa -> evitaría enumerar solicitudes de todos los salones.
--   - Consulta de estado por public_code: función security definer que hace el
--     único SELECT posible, buscando por el código exacto (96 bits de entropía,
--     ver set_request_public_code en 0008) — el código actúa como contraseña
--     de un solo uso (CLAUDE.md sección 7.4).

-- salons: lectura pública de un salón activo por slug ---------------------------
create policy salons_select_anon
  on public.salons for select to anon
  using (is_active = true and subscription_status in ('trial', 'active'));

grant select on public.salons to anon;

-- requests: creación pública (source='qr') ---------------------------------------
create policy requests_insert_anon
  on public.requests for insert to anon
  with check (
    source = 'qr'
    and client_id is null
    and exists (
      select 1 from public.salons s
      where s.id = requests.salon_id
        and s.is_active
        and s.subscription_status in ('trial', 'active')
    )
  );

grant insert on public.requests to anon;

-- request_items: mismo criterio + el servicio debe estar activo -----------------
create policy request_items_insert_anon
  on public.request_items for insert to anon
  with check (
    exists (
      select 1 from public.requests r
      join public.salons s on s.id = r.salon_id
      where r.id = request_items.request_id
        and r.source = 'qr'
        and s.is_active
        and s.subscription_status in ('trial', 'active')
    )
    and exists (
      select 1 from public.services sv
      where sv.id = request_items.service_id and sv.is_active
    )
  );

grant insert on public.request_items to anon;

-- Anti-spam: máximo 5 solicitudes por (salon_id, client_phone) por hora.
-- Enforced en la base de datos (no solo en la Server Action) porque el rol
-- anon tiene acceso directo a PostgREST y podría saltarse la Server Action.
-- Nota: corregida en la migración 0014 para no limitar solicitudes manuales.
create or replace function public.check_request_rate_limit()
returns trigger
language plpgsql
as $$
declare
  v_recent_count integer;
begin
  select count(*) into v_recent_count
  from public.requests
  where salon_id = new.salon_id
    and client_phone = new.client_phone
    and created_at > now() - interval '1 hour';

  if v_recent_count >= 5 then
    raise exception 'Demasiadas solicitudes recientes para este teléfono, intenta más tarde'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger check_request_rate_limit
  before insert on public.requests
  for each row execute function public.check_request_rate_limit();

-- list_public_staff_for_salon ----------------------------------------------------
-- Único punto de acceso de anon a datos de staff: solo id+full_name de
-- trabajadores activos, nunca teléfono/salario/fecha de contratación.
create or replace function public.list_public_staff_for_salon(p_salon_id uuid)
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select st.id, st.full_name
  from public.staff st
  where st.salon_id = p_salon_id and st.is_active = true
  order by st.full_name;
$$;

grant execute on function public.list_public_staff_for_salon(uuid) to anon;

comment on function public.list_public_staff_for_salon(uuid) is
  'Trabajadores activos de un salón, solo id+full_name, para el selector de "trabajador preferido" del portal público.';

-- get_request_status --------------------------------------------------------------
-- Búsqueda por public_code (la única "identidad" del cliente, CLAUDE.md sección
-- 6). Devuelve null si no hay coincidencia; nunca lanza excepción por código
-- inválido (evita filtrar si el código existe o no vía el tipo de error).
create or replace function public.get_request_status(p_public_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
  v_appointment public.appointments%rowtype;
  v_items jsonb;
  v_salon_name text;
  v_salon_currency text;
  v_salon_timezone text;
begin
  select * into v_request from public.requests where public_code = p_public_code;
  if not found then
    return null;
  end if;

  select name, currency, timezone into v_salon_name, v_salon_currency, v_salon_timezone
    from public.salons where id = v_request.salon_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'serviceName', ri.service_name_snapshot,
    'priceCents', ri.price_cents_snapshot,
    'staffFullName', st.full_name
  )), '[]'::jsonb) into v_items
  from public.request_items ri
  left join public.staff st on st.id = ri.staff_id
  where ri.request_id = v_request.id;

  select * into v_appointment from public.appointments where request_id = v_request.id limit 1;

  return jsonb_build_object(
    'salonName', v_salon_name,
    'currency', v_salon_currency,
    'timezone', v_salon_timezone,
    'status', v_request.status,
    'clientName', v_request.client_name,
    'preferredDate', v_request.preferred_date,
    'createdAt', v_request.created_at,
    'items', v_items,
    'appointment', case
      when found then jsonb_build_object(
        'appointmentDate', v_appointment.appointment_date,
        'status', v_appointment.status
      )
      else null
    end
  );
end;
$$;

grant execute on function public.get_request_status(text) to anon, authenticated;

comment on function public.get_request_status(text) is
  'Estado de una solicitud/cita para el cliente anónimo, localizada exclusivamente por public_code (Fase 2/3, CLAUDE.md sección 7.4).';
