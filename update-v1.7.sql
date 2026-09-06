-- NEXO Público v1.7 — estrutura de fontes, observações, ações e auditoria de agentes
-- NÃO APLICADO AUTOMATICAMENTE. Revise no projeto Supabase antes de executar.

create table if not exists public.decision_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text not null,
  source_type text not null default 'app',
  status text not null default 'planned' check (status in ('planned','live','paused')),
  description text,
  owner_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.decision_observations (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.decision_sources(id) on delete restrict,
  area text not null,
  indicator_key text not null,
  indicator_label text not null,
  value_numeric numeric,
  value_text text,
  unit text,
  territory_type text,
  territory_id text,
  territory_label text,
  audience text,
  period_start date,
  period_end date,
  collected_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists decision_observations_source_idx on public.decision_observations(source_id);
create index if not exists decision_observations_indicator_idx on public.decision_observations(indicator_key);
create index if not exists decision_observations_area_idx on public.decision_observations(area);
create index if not exists decision_observations_territory_idx on public.decision_observations(territory_type, territory_id);

create table if not exists public.decision_actions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  area text not null,
  territory_label text,
  responsible text,
  deadline date,
  goal text,
  evidence text,
  urgency smallint not null default 3 check (urgency between 1 and 5),
  impact smallint not null default 3 check (impact between 1 and 5),
  status text not null default 'planned' check (status in ('planned','progress','done','paused')),
  result text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists decision_actions_status_idx on public.decision_actions(status);
create index if not exists decision_actions_deadline_idx on public.decision_actions(deadline);
create index if not exists decision_actions_area_idx on public.decision_actions(area);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  mode text not null check (mode in ('local','external')),
  question text,
  input_summary jsonb not null default '{}'::jsonb,
  output_summary text,
  limitations text,
  provider text,
  model text,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- RLS: nenhuma tabela administrativa deve ficar aberta ao navegador por padrão.
alter table public.decision_sources enable row level security;
alter table public.decision_observations enable row level security;
alter table public.decision_actions enable row level security;
alter table public.agent_runs enable row level security;

revoke all on table public.decision_sources from anon, authenticated;
revoke all on table public.decision_observations from anon, authenticated;
revoke all on table public.decision_actions from anon, authenticated;
revoke all on table public.agent_runs from anon, authenticated;

-- Acesso previsto via Edge Functions administrativas, que devem validar o administrador
-- antes de usar um cliente privilegiado no servidor.

comment on table public.decision_sources is 'Fontes/apps/instrumentos que alimentam o NEXO Público.';
comment on table public.decision_observations is 'Indicadores agregados e observações padronizadas para análise intersetorial.';
comment on table public.decision_actions is 'Decisões e ações monitoráveis aprovadas pela gestão.';
comment on table public.agent_runs is 'Trilha de auditoria das execuções dos agentes locais ou externos.';
