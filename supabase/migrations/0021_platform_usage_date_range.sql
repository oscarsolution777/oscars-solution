-- SuperAdmin -> Uso: selector de fechas (hoy/ayer/semana/mes/personalizado,
-- CLAUDE.md sección 9 lista de ajustes de la fase de rediseño de gráficos).
-- platform_usage_summary() solo devolvía totales acumulados desde siempre,
-- sin forma de ver la actividad de un periodo concreto.
--
-- Nota de zona horaria: esta vista es cross-tenant (salones en distintas
-- timezones), a diferencia del resto de CLAUDE.md sección 5 ("Fechas") que
-- siempre exige resolver "hoy" en la zona horaria de UN salón concreto. Aquí
-- no existe una única zona horaria correcta, así que los límites de fecha
-- los resuelve el cliente (Panel SuperAdmin) en UTC y se pasan ya como
-- timestamptz — es una vista aproximada de uso, no un dato financiero por
-- salón (esos siguen su propia regla estricta en cada módulo del panel).
drop function if exists public.platform_usage_summary();

create or replace function public.platform_usage_summary(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  salon_id            uuid,
  salon_name          text,
  currency            text,
  appointments_count  bigint,
  paid_revenue_cents  bigint,
  clients_count       bigint,
  last_activity_at    timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select
    s.id,
    s.name,
    s.currency,
    coalesce(a.appointments_count, 0),
    coalesce(p.paid_revenue_cents, 0),
    coalesce(c.clients_count, 0),
    greatest(a.last_appointment_at, p.last_payment_at)
  from public.salons s
  left join (
    select
      ap.salon_id,
      count(*) as appointments_count,
      max(ap.created_at) as last_appointment_at
    from public.appointments ap
    where (p_from is null or ap.created_at >= p_from)
      and (p_to is null or ap.created_at <= p_to)
    group by ap.salon_id
  ) a on a.salon_id = s.id
  left join (
    select
      pm.salon_id,
      sum(pm.amount_cents) filter (where pm.status = 'paid') as paid_revenue_cents,
      max(pm.created_at) as last_payment_at
    from public.payments pm
    where (p_from is null or pm.paid_at >= p_from)
      and (p_to is null or pm.paid_at <= p_to)
    group by pm.salon_id
  ) p on p.salon_id = s.id
  left join (
    -- clients_count queda fuera del filtro de fecha a propósito: es una foto
    -- del total de clientes activos hoy, no un flujo del periodo (a
    -- diferencia de citas/ingresos, que sí son "cuánto pasó en este rango").
    select cl.salon_id, count(*) as clients_count
    from public.clients cl
    where cl.is_active
    group by cl.salon_id
  ) c on c.salon_id = s.id
  order by s.name;
end;
$$;

grant execute on function public.platform_usage_summary(timestamptz, timestamptz) to authenticated;

comment on function public.platform_usage_summary(timestamptz, timestamptz) is
  'Métricas agregadas por salón para el Panel SuperAdmin (uso, no datos sensibles), opcionalmente acotadas a un rango de fechas. Sin argumentos (o NULL en ambos) devuelve los totales acumulados de siempre. Lanza excepción si el llamante no es platform admin.';
