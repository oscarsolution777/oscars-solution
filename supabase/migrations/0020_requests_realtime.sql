-- Habilita Supabase Realtime (postgres_changes) sobre requests: el sidebar
-- del panel escucha inserts/updates de su salón activo para refrescar el
-- badge de "pendientes" en "Solicitudes y Citas" al instante (apenas entra
-- una solicitud nueva desde el QR, o cambia el estado de una existente), en
-- vez de solo al recargar la página completa (ajuste pedido explícitamente
-- por el dueño de la agencia). La autorización por fila la sigue resolviendo
-- la política RLS requests_select_members ya existente (migración 0008): un
-- usuario del panel solo recibe eventos de las filas de su(s) salón(es)
-- activo(s), nunca de otros tenants.
alter publication supabase_realtime add table public.requests;
