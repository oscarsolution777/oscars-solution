-- Bloque 10: chat de IA con datos reales + límite a "Regenerar" en
-- Analizar negocio/Recomendaciones (CLAUDE.md sección 9).
--
-- Dos piezas independientes, mismo commit porque ambas tocan el módulo de
-- IA y sus límites de uso:
--
-- 1. ai_regenerate_usage: cuenta cuántas veces se forzó una regeneración
--    manual HOY, por salón (no por kind/locale -- "Regenerar" dispara
--    análisis + recomendaciones juntos como una sola acción de usuario,
--    ver regenerateAllAction). Se resetea solo al cambiar el día. Mismo
--    patrón de "tabla + función security definer" que list_salon_members/
--    update_salon_membership (Fase 10): la función hace el chequeo Y el
--    incremento de forma atómica (select ... for update) para que dos
--    clics simultáneos no se salten el límite.
--
-- 2. ai_chat_messages: historial persistido del chat libre (owner/admin,
--    mismo perfil de permisos que ai_analyses). El límite de 20
--    mensajes/hora se refuerza con un trigger en la propia tabla, igual
--    que check_request_rate_limit (Fase 2) -- nunca confiar solo en la
--    Server Action, porque RLS ya permite el insert directo por
--    PostgREST a cualquier owner/admin.

-- ai_regenerate_usage ---------------------------------------------------------
create table public.ai_regenerate_usage (
  salon_id   uuid primary key references public.salons(id) on delete cascade,
  count      integer not null default 0,
  count_date date not null default current_date,
  updated_at timestamptz not null default now()
);

comment on table public.ai_regenerate_usage is
  'Contador diario de regeneraciones manuales de Analizar negocio + '
  'Recomendaciones (una sola acción de usuario). Se resetea solo al '
  'cambiar el día, nunca por un job aparte. Solo se escribe a través de '
  'increment_ai_regenerate_usage(), mismo patrón que audit_log.';

alter table public.ai_regenerate_usage enable row level security;

create policy ai_regenerate_usage_select_owner_admin
  on public.ai_regenerate_usage for select to authenticated
  using (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner', 'admin']))
  );

-- Sin políticas de insert/update: la única vía de escritura es la función
-- security definer de abajo (igual que audit_log / log_audit_event).
grant select on public.ai_regenerate_usage to authenticated;

create or replace function public.increment_ai_regenerate_usage(
  p_salon_id uuid,
  p_max integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_date  date;
begin
  if not public.has_role_in_salon(p_salon_id, array['owner', 'admin']) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  insert into public.ai_regenerate_usage (salon_id, count, count_date)
  values (p_salon_id, 0, current_date)
  on conflict (salon_id) do nothing;

  select count, count_date into v_count, v_date
  from public.ai_regenerate_usage
  where salon_id = p_salon_id
  for update;

  if v_date <> current_date then
    v_count := 0;
    v_date := current_date;
  end if;

  if v_count >= p_max then
    -- Persiste el reset de fecha aunque el intento se rechace, para que el
    -- primer chequeo del día siguiente ya arranque en 0 sin depender de
    -- que este mismo "if" se vuelva a evaluar con la fecha vieja.
    update public.ai_regenerate_usage
    set count_date = v_date
    where salon_id = p_salon_id;
    return jsonb_build_object('ok', false, 'error', 'limit_reached', 'remaining', 0);
  end if;

  v_count := v_count + 1;

  update public.ai_regenerate_usage
  set count = v_count, count_date = v_date, updated_at = now()
  where salon_id = p_salon_id;

  return jsonb_build_object('ok', true, 'remaining', p_max - v_count);
end;
$$;

grant execute on function public.increment_ai_regenerate_usage(uuid, integer) to authenticated;

comment on function public.increment_ai_regenerate_usage(uuid, integer) is
  'Chequeo + incremento atómico (for update) del contador diario de '
  'regenerar. p_max lo decide la app (3, CLAUDE.md sección 9); la función '
  'no conoce el número para poder ajustarlo sin migración.';

-- ai_chat_messages -------------------------------------------------------------
create table public.ai_chat_messages (
  id         uuid primary key default gen_random_uuid(),
  salon_id   uuid not null references public.salons(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null check (char_length(content) > 0),
  created_at timestamptz not null default now()
);

comment on table public.ai_chat_messages is
  'Historial del chat libre de IA (Fase 10B). Solo se guardan los turnos '
  'de texto final -- las llamadas a herramientas intermedias de cada '
  'turno no se persisten, se rehacen en cada mensaje nuevo a partir de '
  'este historial de texto. Mismo perfil de permisos que ai_analyses '
  '(owner/admin, CLAUDE.md sección 7). Las respuestas del asistente '
  'pueden citar nombre + agregados de un cliente (gasto total, nº de '
  'visitas) pero nunca teléfono/email/notas -- las herramientas de '
  'src/lib/ai/tools/ nunca las exponen (CLAUDE.md sección 7.8).';

create index idx_ai_chat_messages_salon_created
  on public.ai_chat_messages (salon_id, created_at);

alter table public.ai_chat_messages enable row level security;

create policy ai_chat_messages_select_owner_admin
  on public.ai_chat_messages for select to authenticated
  using (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner', 'admin']))
  );

create policy ai_chat_messages_insert_owner_admin
  on public.ai_chat_messages for insert to authenticated
  with check (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner', 'admin']))
  );

grant select, insert on public.ai_chat_messages to authenticated;

-- Límite de 20 mensajes de usuario por hora por salón (no por usuario
-- individual -- owner y admin comparten el mismo salon_id). Solo cuenta
-- role='user': las respuestas del asistente no consumen el cupo. Mismo
-- patrón que check_request_rate_limit (Fase 2, 0013/0014): enforced en la
-- base porque RLS ya permite el insert directo, no solo desde la Server
-- Action.
create or replace function public.check_ai_chat_rate_limit()
returns trigger
language plpgsql
as $$
declare
  v_count integer;
begin
  if new.role <> 'user' then
    return new;
  end if;

  select count(*) into v_count
  from public.ai_chat_messages
  where salon_id = new.salon_id
    and role = 'user'
    and created_at > now() - interval '1 hour';

  if v_count >= 20 then
    raise exception 'Demasiados mensajes de chat recientes para este salón, intenta más tarde'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger check_ai_chat_rate_limit
  before insert on public.ai_chat_messages
  for each row execute function public.check_ai_chat_rate_limit();
