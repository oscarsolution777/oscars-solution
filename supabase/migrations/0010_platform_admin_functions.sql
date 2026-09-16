-- Fase 9A: funciones de apoyo para el Panel SuperAdmin. Sin tablas nuevas —
-- solo dos funciones security definer, mismo patrón que is_platform_admin()/
-- has_role_in_salon() (0002/0004). Ver CLAUDE.md secciones 6, 7 y 10.

-- expire_due_demo_salons ------------------------------------------------------
-- CLAUDE.md sección 6, "Demos con expiración": cualquier salón is_demo cuyo
-- demo_expires_at ya pasó debe pasar a subscription_status='suspended'. El
-- proyecto no tiene infraestructura de cron, así que se invoca de forma
-- oportunista (rpc) al cargar /admin/salons y dentro de getCurrentSession().
-- Es seguro exponerla a cualquier usuario autenticado: solo corrige salones ya
-- vencidos, nunca permite suspender un salón arbitrario a demanda.
create or replace function public.expire_due_demo_salons()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.salons
  set subscription_status = 'suspended'
  where is_demo
    and demo_expires_at < now()
    and subscription_status not in ('suspended', 'cancelled');
end;
$$;

grant execute on function public.expire_due_demo_salons() to authenticated;

comment on function public.expire_due_demo_salons() is
  'Suspende automáticamente los salones demo cuyo demo_expires_at ya venció. Solo corrige salones ya vencidos, no admite parámetros.';

-- platform_usage_summary -------------------------------------------------------
-- CLAUDE.md sección 7.3: el SuperAdmin ve métricas agregadas por salón, nunca
-- filas individuales de clientes/pagos. La función agrega en SQL y solo
-- devuelve conteos/sumas; el chequeo de rol vive dentro de la función (no hay
-- RLS de fila posible sobre el resultado de un agregado).
create or replace function public.platform_usage_summary()
returns table (
  salon_id            uuid,
  salon_name          text,
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
