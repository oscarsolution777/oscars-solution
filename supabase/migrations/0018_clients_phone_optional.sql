-- Fase de rediseño de gráficos y ajustes de UX (ver CLAUDE.md sección 6,
-- "Personas"): el teléfono del cliente pasa a ser opcional, igual que ya lo
-- es el correo electrónico. clients.phone era NOT NULL con un check de no
-- vacío; ahora permite NULL pero, si viene informado, sigue sin poder ser
-- una cadena vacía o solo espacios.

alter table public.clients
  alter column phone drop not null;

alter table public.clients
  drop constraint if exists clients_phone_check;

alter table public.clients
  add constraint clients_phone_check check (phone is null or char_length(btrim(phone)) > 0);
