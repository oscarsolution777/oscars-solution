-- Fase 9A (ajuste): platform_usage_summary() necesita la moneda de cada
-- salón para poder formatear paid_revenue_cents en la UI del SuperAdmin
-- (formatMoney exige currencyCode) — se había omitido en 0010.
drop function if exists public.platform_usage_summary();

create or replace function public.platform_usage_summary()
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
    group by ap.salon_id
  ) a on a.salon_id = s.id
  left join (
    select
      pm.salon_id,
      sum(pm.amount_cents) filter (where pm.status = 'paid') as paid_revenue_cents,
      max(pm.created_at) as last_payment_at
    from public.payments pm
    group by pm.salon_id
  ) p on p.salon_id = s.id
  left join (
    select cl.salon_id, count(*) as clients_count
    from public.clients cl
    where cl.is_active
    group by cl.salon_id
  ) c on c.salon_id = s.id
  order by s.name;
end;
$$;

grant execute on function public.platform_usage_summary() to authenticated;

comment on function public.platform_usage_summary() is
  'Métricas agregadas por salón para el Panel SuperAdmin (uso, no datos sensibles). Lanza excepción si el llamante no es platform admin.';
