-- Acceso de soporte del desarrollador a cada salón: en vez de un rol
-- "administrador" nuevo con su propio juego de reglas RLS, cada cuenta en
-- platform_admins recibe automáticamente una membership 'owner' en todo
-- salón (existente y futuro) -- mismo nivel de acceso que la dueña, con su
-- propia cuenta (no se comparte contraseña con nadie), usando el selector de
-- salón que ya existe desde la Fase 10 para saltar entre todos los salones.
-- Decisión de negocio: en vez de reservar un rol "administrador" exclusivo
-- del dueño de la agencia (que hubiera exigido nuevas políticas RLS en
-- Finanzas/Configuración), se usa el mecanismo de multi-salón que ya existe.
-- Los 3 roles de memberships (owner/admin/reception) y sus permisos
-- (CLAUDE.md sección 7) no cambian.

-- Helper: variante de is_platform_admin() que recibe el user_id a comprobar
-- en vez de usar auth.uid() -- hace falta para filtrar/proteger la fila de
-- OTRO usuario (el desarrollador) desde dentro de list_salon_members/
-- update_salon_membership, no la del que llama.
create or replace function public.is_platform_admin_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = p_user_id
  );
$$;

grant execute on function public.is_platform_admin_user(uuid) to authenticated;

-- Backfill: asegura la membership 'owner' de cada platform admin en cada
-- salón que ya existe hoy. "do update" (no "do nothing"): si el platform
-- admin ya tenía una membership con un rol menor en algún salón (ej. una de
-- prueba con role='admin'), se promueve a 'owner' -- la intención es acceso
-- total siempre, no solo cuando todavía no existía la fila.
insert into public.memberships (user_id, salon_id, role, is_active)
select pa.user_id, s.id, 'owner', true
from public.platform_admins pa
cross join public.salons s
on conflict (user_id, salon_id) do update set role = 'owner', is_active = true;

-- Trigger: cualquier salón nuevo (real o demo, desde cualquier vía futura,
-- no solo las Server Actions de hoy) recibe automáticamente la membership
-- 'owner' de cada platform admin vigente en ese momento.
create or replace function public.grant_platform_admin_memberships()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.memberships (user_id, salon_id, role, is_active)
  select pa.user_id, new.id, 'owner', true
  from public.platform_admins pa
  on conflict (user_id, salon_id) do update set role = 'owner', is_active = true;
  return new;
end;
$$;

create trigger salons_grant_platform_admin_memberships
  after insert on public.salons
  for each row
  execute function public.grant_platform_admin_memberships();

-- list_salon_members: la dueña no necesita ver (ni podría gestionar) la
-- membership de soporte del desarrollador en su propio listado de "Usuarios"
-- -- confundiría una fila que no dio de alta ella y que no puede tocar.
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
    and not public.is_platform_admin_user(m.user_id)
  order by m.created_at asc;
$$;

-- update_salon_membership: defensa en profundidad -- aunque la dueña ya no
-- ve esa fila en su UI (list_salon_members la excluye arriba), la función
-- también rechaza cualquier intento directo de tocarla, igual que ya hace
-- con "cannot_edit_self".
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

  if public.is_platform_admin_user(v_membership.user_id) then
    return jsonb_build_object('ok', false, 'error', 'cannot_edit_platform_admin');
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
