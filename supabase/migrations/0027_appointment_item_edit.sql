-- Puntos 14 y 15 del bloque de ajustes posterior a la Fase 10: se habilita
-- "Editar" una cita (servicio/trabajador de cada appointment_item) mientras
-- sigue en estado "scheduled" -- antes solo se podía cambiar el estado o la
-- fecha; un error de captura (servicio o trabajador equivocado) solo se
-- podía resolver cancelando y creando una cita nueva.
--
-- appointment_items sigue sin DELETE (comentario original de la migración
-- 0008, filosofía de "corrección por estado" de CLAUDE.md sección 6) -- la
-- edición es un UPDATE de las filas ya existentes (service_id/staff_id), no
-- un reemplazo del conjunto completo.
--
-- El trigger snapshot_appointment_item (migración 0008) solo corría
-- `before insert`: un UPDATE de service_id dejaría price_cents con el valor
-- viejo (nunca se confía en que la aplicación lo recalcule, mismo principio
-- que ya aplica esta función en el insert). Se extiende para correr también
-- `before update of service_id, staff_id` -- misma lógica de recalcular
-- price_cents y revalidar que el nuevo servicio/trabajador pertenezcan al
-- salón de la cita.

drop trigger if exists snapshot_appointment_item on public.appointment_items;

create trigger snapshot_appointment_item
  before insert or update of service_id, staff_id on public.appointment_items
  for each row execute function public.snapshot_appointment_item();
