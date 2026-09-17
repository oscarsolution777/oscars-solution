-- Fase 9B: caché de resultados del módulo de IA (CLAUDE.md sección 9).
-- Un registro por (salon_id, kind, locale) vigente: cada regeneración hace
-- upsert sobre la misma fila, no se acumula historial. Mismo patrón de RLS
-- reforzada por rol que "Finanzas" (0007_payments_and_finances.sql):
-- owner y admin sí, reception no tiene ningún acceso (CLAUDE.md sección 7,
-- IA es owner ✅ admin ✅ reception ❌).

create table public.ai_analyses (
  id          uuid primary key default gen_random_uuid(),
  salon_id    uuid not null references public.salons(id) on delete cascade,
  kind        text not null check (kind in ('analysis', 'recommendations')),
  locale      text not null,
  period_from date not null,
  period_to   date not null,
  result      jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (salon_id, kind, locale)
);

comment on table public.ai_analyses is
  'Caché del último resultado de IA por salón/tipo/idioma (Fase 9B). Se '
  'sobreescribe con upsert en cada regeneración, no es un historial. '
  'result guarda un string (analysis) o un array de recomendaciones '
  '(recommendations), ya validado con Zod antes de guardarse. Sin datos '
  'personales de clientes: el prompt solo recibe métricas agregadas '
  '(CLAUDE.md sección 7.8).';

create index idx_ai_analyses_salon_id on public.ai_analyses (salon_id);

create trigger set_updated_at
  before update on public.ai_analyses
  for each row execute function public.set_updated_at();

alter table public.ai_analyses enable row level security;

create policy ai_analyses_select_owner_admin
  on public.ai_analyses for select to authenticated
  using (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner', 'admin']))
  );

create policy ai_analyses_insert_owner_admin
  on public.ai_analyses for insert to authenticated
  with check (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner', 'admin']))
  );

create policy ai_analyses_update_owner_admin
  on public.ai_analyses for update to authenticated
  using (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner', 'admin']))
  )
  with check (
    public.is_platform_admin()
    or (salon_id in (select public.active_salon_ids())
        and public.has_role_in_salon(salon_id, array['owner', 'admin']))
  );

grant select, insert, update on public.ai_analyses to authenticated;
