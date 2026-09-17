-- Fase 10: autoservicio de configuración para la dueña (CLAUDE.md secciones
-- 6/10/11 dejaban esto explícitamente pendiente: "escritura solo SuperAdmin
-- (autoservicio de configuración por la dueña es Fase 10)").
--
-- Mismo patrón que las Fases 2/3 (get_request_status, cancel_request_by_code,
-- list_public_staff_for_salon): funciones `security definer` en vez de
-- políticas RLS de UPDATE directas. Así `salons_admin_write`/
-- `memberships_admin_write` (SuperAdmin, migración 0003) quedan intactas y no
-- hace falta un trigger de "columnas protegidas" -- la función solo permite
-- tocar las columnas que decide exponer.

-- audit_log ------------------------------------------------------------------
-- Tabla "Sistema" de CLAUDE.md sección 6. Alcance acotado a esta fase (no se
-- instrumenta cada Server Action del proyecto): cambios de datos del salón,
-- cambios de rol/estado de membresías, y confirmar/rechazar solicitudes o
-- cancelar citas desde el panel.
create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  salon_id   uuid not null references public.salons(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  entity     text not null,
  entity_id  uuid,
  action     text not null,
  diff       jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_salon_id_created_at_idx
  on public.audit_log (salon_id, created_at desc);

alter table public.audit_log enable row level security;

-- Solo la dueña puede leer el rastro de auditoría de su salón. Sin política
-- de insert: la única vía de escritura es log_audit_event() (más abajo), sin
-- grants directos de authenticated sobre la tabla.
create policy "audit_log_select_owner"
  on public.audit_log for select
  using (public.has_role_in_salon(salon_id, array['owner']));

-- Escribe una fila de auditoría con el usuario actual. Se llama desde dentro
-- de otras funciones `security definer` de esta migración (transacción única
-- con el cambio que audita) y desde Server Actions ya existentes del panel.
create or replace function public.log_audit_event(
  p_salon_id uuid,
  p_entity text,
  p_entity_id uuid,
  p_action text,
  p_diff jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (salon_id, user_id, entity, entity_id, action, diff)
  values (p_salon_id, auth.uid(), p_entity, p_entity_id, p_action, p_diff);
end;
$$;

grant execute on function public.log_audit_event(uuid, text, uuid, text, jsonb) to authenticated;

-- update_salon_profile --------------------------------------------------------
-- Autoservicio de datos del salón para la dueña. Nunca toca currency,
-- subscription_status, is_demo, demo_expires_at, slug o is_active -- esas
-- columnas siguen siendo exclusivas del Panel SuperAdmin (Fase 9A).
create or replace function public.update_salon_profile(
  p_salon_id uuid,
  p_name text,
  p_logo_url text,
  p_phone text,
  p_address text,
  p_timezone text,
  p_default_locale text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.salons%rowtype;
begin
  if not public.has_role_in_salon(p_salon_id, array['owner']) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;

  if p_default_locale not in ('es', 'en', 'pt', 'it', 'fr', 'de') then
    return jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;

  select * into v_before from public.salons where id = p_salon_id;

  update public.salons set
    name = p_name,
    logo_url = p_logo_url,
    phone = p_phone,
    address = p_address,
    timezone = p_timezone,
    default_locale = p_default_locale
  where id = p_salon_id;

  perform public.log_audit_event(
    p_salon_id,
    'salon',
    p_salon_id,
    'salon_profile_updated',
    jsonb_build_object(
      'before', jsonb_build_object(
        'name', v_before.name, 'phone', v_before.phone, 'address', v_before.address,
        'timezone', v_before.timezone, 'default_locale', v_before.default_locale
      ),
      'after', jsonb_build_object(
        'name', p_name, 'phone', p_phone, 'address', p_address,
        'timezone', p_timezone, 'default_locale', p_default_locale
      )
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.update_salon_profile(uuid, text, text, text, text, text, text) to authenticated;

-- list_salon_members / update_salon_membership --------------------------------
-- El email vive en auth.users, no expuesto hoy vía RLS a `profiles` -- se
-- resuelve aquí dentro, con privilegios elevados, en vez de abrir una
-- política nueva solo para este caso.
create or replace function public.list_salon_members(p_salon_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  full_name text,
  email text,
  role text,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.user_id, p.full_name, u.email, m.role, m.is_active
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  join auth.users u on u.id = m.user_id
  where m.salon_id = p_salon_id
    and public.has_role_in_salon(p_salon_id, array['owner'])
  order by m.created_at asc;
$$;

grant execute on function public.list_salon_members(uuid) to authenticated;

create or replace function public.update_salon_membership(
  p_membership_id uuid,
  p_role text,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.memberships%rowtype;
begin
  select * into v_membership from public.memberships where id = p_membership_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.has_role_in_salon(v_membership.salon_id, array['owner']) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_membership.user_id = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'cannot_edit_self');
  end if;

  if p_role not in ('owner', 'admin', 'reception') then
    return jsonb_build_object('ok', false, 'error', 'invalid_role');
  end if;

  update public.memberships set role = p_role, is_active = p_is_active
  where id = p_membership_id;

  perform public.log_audit_event(
    v_membership.salon_id,
    'membership',
    p_membership_id,
    'membership_updated',
    jsonb_build_object(
      'before', jsonb_build_object('role', v_membership.role, 'is_active', v_membership.is_active),
      'after', jsonb_build_object('role', p_role, 'is_active', p_is_active)
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.update_salon_membership(uuid, text, boolean) to authenticated;

-- Storage: bucket público del logo del salón -----------------------------------
-- Mismo patrón que 'service-images' (migración 0004), pero solo owner (no
-- admin) puede escribir -- CLAUDE.md sección 7: "Configuración" es owner ✅ /
-- admin parcial (solo lectura).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('salon-logos', 'salon-logos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy salon_logos_public_read
  on storage.objects for select to public
  using (bucket_id = 'salon-logos');

-- Convención de ruta: <salon_id>/<uuid>.<ext>
create policy salon_logos_owner_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'salon-logos'
    and public.has_role_in_salon((storage.foldername(name))[1]::uuid, array['owner'])
  );

create policy salon_logos_owner_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'salon-logos'
    and public.has_role_in_salon((storage.foldername(name))[1]::uuid, array['owner'])
  )
  with check (
    bucket_id = 'salon-logos'
    and public.has_role_in_salon((storage.foldername(name))[1]::uuid, array['owner'])
  );

create policy salon_logos_owner_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'salon-logos'
    and public.has_role_in_salon((storage.foldername(name))[1]::uuid, array['owner'])
  );

create policy salon_logos_platform_admin_all
  on storage.objects for all to authenticated
  using (bucket_id = 'salon-logos' and public.is_platform_admin())
  with check (bucket_id = 'salon-logos' and public.is_platform_admin());
