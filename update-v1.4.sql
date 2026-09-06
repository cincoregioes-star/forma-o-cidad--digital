-- Formação Cidadã v1.4 — camada multifonte para Tomada de Decisão
-- Aplicar somente quando a integração real com Supabase for iniciada.

create extension if not exists pgcrypto;

create table if not exists public.decision_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  name text not null,
  area text not null,
  source_type text not null default 'app',
  status text not null default 'planned' check (status in ('planned','active','paused','retired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.decision_observations (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.decision_sources(id) on delete restrict,
  instrument_key text,
  area text not null,
  territory text,
  unit_type text,
  unit_ref text,
  population_group text,
  indicator_key text not null,
  value_numeric numeric,
  value_text text,
  value_json jsonb,
  period_start date,
  period_end date,
  collected_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint decision_observation_has_value check (
    value_numeric is not null or value_text is not null or value_json is not null
  )
);

create index if not exists decision_observations_source_idx on public.decision_observations(source_id);
create index if not exists decision_observations_area_idx on public.decision_observations(area);
create index if not exists decision_observations_territory_idx on public.decision_observations(territory);
create index if not exists decision_observations_indicator_idx on public.decision_observations(indicator_key);
create index if not exists decision_observations_collected_idx on public.decision_observations(collected_at desc);

alter table public.decision_sources enable row level security;
alter table public.decision_observations enable row level security;

revoke all on public.decision_sources from anon, authenticated;
revoke all on public.decision_observations from anon, authenticated;
grant all on public.decision_sources to service_role;
grant all on public.decision_observations to service_role;

insert into public.decision_sources (source_key, name, area, source_type, status, metadata)
values (
  'formacao_cidada_estudante',
  'App Formação Cidadã',
  'Educação',
  'app',
  'active',
  '{"scope":"Fundamental II e Ensino Médio","data_policy":"indicadores mínimos e resultados administrativos"}'::jsonb
)
on conflict (source_key) do update set
  name = excluded.name,
  area = excluded.area,
  status = excluded.status,
  metadata = excluded.metadata,
  updated_at = now();

comment on table public.decision_sources is 'Catálogo de apps, serviços e instrumentos que alimentam a Tomada de Decisão.';
comment on table public.decision_observations is 'Indicadores multifonte preferencialmente agregados; não é prontuário individual.';
