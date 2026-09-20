-- Fase de rediseño de gráficos y ajustes de UX (ver CLAUDE.md sección 6,
-- "Flujo operativo"): el estado de una cita (completed/no_show/cancelled)
-- ahora se puede corregir en cualquier momento desde el panel, no solo
-- mientras está "scheduled" (ver appointments-table.tsx). apply_appointment_completion
-- solo contemplaba la transición HACIA 'completed'; si la dueña se
-- equivoca y marca una cita como completada, el stock ya se descontó y
-- quedaba descontado para siempre aunque corrigiera el estado. Esta
-- migración añade la reversión simétrica: al salir de 'completed' hacia
-- cualquier otro estado, se registra un movimiento 'in' compensatorio por
-- cada product_id que se había descontado.
--
-- Limitación conocida y aceptada (igual que ya existía en el sentido
-- contrario): la reversión usa las cantidades ACTUALES de service_products,
-- no una foto de las que existían al completar la cita. Si la dueña edita
-- la receta de un servicio entre medias, la reversión no será exacta. No es
-- un caso nuevo: apply_appointment_completion ya tenía esta misma
-- limitación al ir hacia 'completed'.

create or replace function public.apply_appointment_completion()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    insert into public.stock_movements (salon_id, product_id, type, qty, reason, created_by, appointment_id)
    select
      new.salon_id,
      sp.product_id,
      'out',
      sp.qty,
      'Consumo automático por cita completada',
      auth.uid(),
      new.id
    from public.appointment_items ai
    join public.service_products sp on sp.service_id = ai.service_id
    where ai.appointment_id = new.id;

    update public.clients
      set
        first_visit_at = least(coalesce(first_visit_at, new.appointment_date::timestamptz), new.appointment_date::timestamptz),
        last_visit_at = greatest(coalesce(last_visit_at, new.appointment_date::timestamptz), new.appointment_date::timestamptz)
      where id = new.client_id;

  elsif old.status = 'completed' and new.status <> 'completed' then
    insert into public.stock_movements (salon_id, product_id, type, qty, reason, created_by, appointment_id)
    select
      new.salon_id,
      sp.product_id,
      'in',
      sp.qty,
      'Reversión automática por corrección del estado de la cita',
      auth.uid(),
      new.id
    from public.appointment_items ai
    join public.service_products sp on sp.service_id = ai.service_id
    where ai.appointment_id = new.id;
  end if;

  return new;
end;
$$;
