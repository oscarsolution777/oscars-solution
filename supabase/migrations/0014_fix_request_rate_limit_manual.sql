-- Corrige check_request_rate_limit (0013): el límite de 5 solicitudes/hora
-- por teléfono debía aplicar solo a source='qr' (portal público, no
-- confiable), nunca a las solicitudes manuales que crea el panel — donde el
-- mismo teléfono puede repetirse varias veces en un día ocupado.
create or replace function public.check_request_rate_limit()
returns trigger
language plpgsql
as $$
declare
  v_recent_count integer;
begin
  if new.source <> 'qr' then
    return new;
  end if;

  select count(*) into v_recent_count
  from public.requests
  where salon_id = new.salon_id
    and client_phone = new.client_phone
    and created_at > now() - interval '1 hour';

  if v_recent_count >= 5 then
    raise exception 'Demasiadas solicitudes recientes para este teléfono, intenta más tarde'
      using errcode = '23514';
  end if;

  return new;
end;
$$;
