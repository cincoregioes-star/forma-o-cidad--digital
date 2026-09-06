-- Projeto Formação Cidadã Digital — Supabase V1.3
-- Painel administrativo + app do estudante + diagnóstico + cobertura municipal + gestão segura de códigos + importação em lote.

create extension if not exists pgcrypto;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text null,
  municipality text null,
  network text null,
  latitude numeric(9,6) null,
  longitude numeric(9,6) null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Compatibilidade com instalações anteriores.
alter table public.schools add column if not exists district text null;
alter table public.schools add column if not exists municipality text null;
alter table public.schools add column if not exists network text null;
alter table public.schools add column if not exists latitude numeric(9,6) null;
alter table public.schools add column if not exists longitude numeric(9,6) null;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  full_name text not null,
  level_key text not null check (level_key in ('fundamental2','medio')),
  level_label text not null,
  grade text not null,
  class_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  code_hash text not null unique,
  code_hint text null,
  auth_user_id uuid null references auth.users(id) on delete set null,
  created_by uuid null references auth.users(id) on delete set null,
  active boolean not null default true,
  redeemed_at timestamptz null,
  used_at timestamptz null,
  revoked_at timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now()
);

alter table public.access_codes add column if not exists code_hint text null;
alter table public.access_codes add column if not exists created_by uuid null references auth.users(id) on delete set null;
alter table public.access_codes add column if not exists revoked_at timestamptz null;

create table if not exists public.diagnostic_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  level_key text not null check (level_key in ('fundamental2','medio')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz null,
  score integer null,
  total integer null,
  percent integer null check (percent is null or (percent between 0 and 100))
);

create table if not exists public.attempt_questions (
  attempt_id uuid not null references public.diagnostic_attempts(id) on delete cascade,
  question_id text not null,
  position integer not null,
  primary key (attempt_id, question_id),
  unique (attempt_id, position)
);

create table if not exists public.answers (
  attempt_id uuid not null references public.diagnostic_attempts(id) on delete cascade,
  question_id text not null,
  answer_index integer not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists schools_name_idx on public.schools(name);
create index if not exists students_school_idx on public.students(school_id);
create index if not exists students_class_idx on public.students(school_id, level_key, grade, class_name);
create index if not exists access_codes_student_idx on public.access_codes(student_id);
create index if not exists access_codes_auth_user_idx on public.access_codes(auth_user_id);
create index if not exists access_codes_created_idx on public.access_codes(created_at desc);
create index if not exists attempts_student_idx on public.diagnostic_attempts(student_id);
create index if not exists attempts_auth_user_idx on public.diagnostic_attempts(auth_user_id);
create index if not exists attempts_submitted_idx on public.diagnostic_attempts(submitted_at);

-- Todas as tabelas sensíveis permanecem fechadas para acesso direto do navegador.
alter table public.schools enable row level security;
alter table public.students enable row level security;
alter table public.access_codes enable row level security;
alter table public.diagnostic_attempts enable row level security;
alter table public.attempt_questions enable row level security;
alter table public.answers enable row level security;
alter table public.admin_users enable row level security;

revoke all on table public.schools from anon, authenticated;
revoke all on table public.students from anon, authenticated;
revoke all on table public.access_codes from anon, authenticated;
revoke all on table public.diagnostic_attempts from anon, authenticated;
revoke all on table public.attempt_questions from anon, authenticated;
revoke all on table public.answers from anon, authenticated;
revoke all on table public.admin_users from anon, authenticated;

grant all on table public.schools to service_role;
grant all on table public.students to service_role;
grant all on table public.access_codes to service_role;
grant all on table public.diagnostic_attempts to service_role;
grant all on table public.attempt_questions to service_role;
grant all on table public.answers to service_role;
grant all on table public.admin_users to service_role;

-- EXEMPLO: cadastrar escola com coordenadas para o mapa.
-- insert into public.schools(name, district, municipality, network, latitude, longitude)
-- values ('Nome da Escola', 'Distrito', 'Beberibe', 'Municipal', -4.179000, -38.129000);

-- ADMINISTRADOR:
-- 1) crie o usuário em Authentication > Users;
-- 2) copie o UUID;
-- 3) execute:
-- insert into public.admin_users(user_id, display_name)
-- values ('UUID_DO_ADMIN', 'Administrador Formação Cidadã');

-- SEGURANÇA DOS CÓDIGOS:
-- O código completo nunca é armazenado. Apenas SHA-256 (code_hash) e os últimos 4 caracteres (code_hint).
-- Se o administrador perder a lista original, deve revogar/regenerar o código antes do uso.

-- V1.3 — Importação em lote e rastreabilidade administrativa
alter table public.schools add column if not exists reference_code text null;
alter table public.students add column if not exists registration_code text null;

create unique index if not exists schools_reference_code_uidx
  on public.schools(reference_code)
  where reference_code is not null and length(trim(reference_code)) > 0;

create unique index if not exists students_school_registration_uidx
  on public.students(school_id, registration_code)
  where registration_code is not null and length(trim(registration_code)) > 0;

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid null references auth.users(id) on delete set null,
  import_type text not null check (import_type in ('schools','students')),
  file_name text null,
  total_rows integer not null default 0,
  inserted_rows integer not null default 0,
  updated_rows integer not null default 0,
  skipped_rows integer not null default 0,
  codes_generated integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists import_batches_created_idx on public.import_batches(created_at desc);

alter table public.import_batches enable row level security;
revoke all on table public.import_batches from anon, authenticated;
grant all on table public.import_batches to service_role;
