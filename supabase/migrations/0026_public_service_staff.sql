-- Punto 7 del bloque de ajustes posterior a la Fase 10: el Portal QR
-- público mostraba TODOS los trabajadores activos del salón como "trabajador
-- preferido" para cualquier servicio, sin filtrar por los que Servicios
-- tiene realmente asignados a ese servicio (service_staff) -- misma
-- inconsistencia que ya se corrigió en el panel de gestión (Solicitudes/
-- Agenda) en el commit anterior.
--
-- `service_staff` no tiene ninguna política/grant para `anon` (solo
-- `authenticated`, migración 0005) -- se añade una función security definer
-- nueva, mismo patrón que `list_public_staff_for_salon` (migración 0013):
-- expone solo el par (service_id, staff_id), nunca la tabla completa ni
-- columnas sensibles. Se filtra explícitamente por `salon_id` en ambos joins
-- (staff y services), igual que `list_public_staff_for_salon` filtra por
-- `st.salon_id = p_salon_id` -- defensa en profundidad, no solo confiar en
-- que `check_service_staff_same_salon` ya lo garantice del lado del insert.

create or replace function public.list_public_service_staff_for_salon(p_salon_id uuid)
returns table (service_id uuid, staff_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select ss.service_id, ss.staff_id
  from public.service_staff ss
  join public.staff st on st.id = ss.staff_id and st.salon_id = p_salon_id and st.is_active = true
  join public.services sv on sv.id = ss.service_id and sv.salon_id = p_salon_id and sv.is_active = true;
$$;

grant execute on function public.list_public_service_staff_for_salon(uuid) to anon;

comment on function public.list_public_service_staff_for_salon(uuid) is
  'Pares (service_id, staff_id) activos de un salón, para filtrar el selector de "trabajador preferido" del portal público por servicio -- nunca expone la tabla service_staff completa ni columnas sensibles de staff.';
