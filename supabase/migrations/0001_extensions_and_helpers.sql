-- Extensiones y funciones auxiliares reutilizadas por todas las migraciones futuras.

create extension if not exists pgcrypto;

-- Mantiene updated_at sincronizado en cualquier tabla que registre este trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
