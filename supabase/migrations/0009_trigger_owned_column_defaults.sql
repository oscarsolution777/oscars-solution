-- Fase 4 (ajuste): añade DEFAULT a las columnas que triggers BEFORE INSERT
-- sobreescriben siempre (public_code, los snapshots de request_items, y
-- price_cents de appointment_items). Sin esto, los tipos generados por
-- Supabase las marcan como requeridas en el Insert aunque la aplicación
-- nunca deba enviarlas — mismo motivo por el que expected_cash_cents/
-- total_cents ya tenían `default 0` desde las Fases 6/7.

alter table public.requests
  alter column public_code set default '';

alter table public.request_items
  alter column service_name_snapshot set default '',
  alter column price_cents_snapshot set default 0;

alter table public.appointment_items
  alter column price_cents set default 0;
