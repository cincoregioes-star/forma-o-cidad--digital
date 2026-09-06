-- Atualização incremental — Formação Cidadã Digital V1.3
-- Execute apenas se o schema V1.2 já estiver instalado.

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
