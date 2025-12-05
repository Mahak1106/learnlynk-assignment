-- Enable extension for UUIDs
create extension if not exists "pgcrypto";

-----------------------
-- LEADS TABLE
-----------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  owner_id uuid not null, -- counselor user id
  team_id uuid,
  name text,
  email text,
  stage text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-----------------------
-- APPLICATIONS TABLE
-----------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  lead_id uuid not null references public.leads(id) on delete cascade,
  program_name text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-----------------------
-- TASKS TABLE
-----------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  title text not null,
  type text not null, -- 'call' | 'email' | 'review'
  status text not null default 'pending',
  related_id uuid not null references public.applications(id) on delete cascade,
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Constraints
  constraint tasks_due_at_after_created check (due_at >= created_at),
  constraint tasks_type_check check (type in ('call','email','review'))
);

-----------------------
-- INDEXES
-----------------------
create index if not exists idx_leads_owner_stage_created_at
  on public.leads (tenant_id, owner_id, stage, created_at desc);

create index if not exists idx_applications_lead
  on public.applications (lead_id);

create index if not exists idx_tasks_due_at
  on public.tasks (tenant_id, due_at);

-----------------------
-- Trigger for updated_at
-----------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger if not exists set_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create trigger if not exists set_applications_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create trigger if not exists set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-----------------------
-- RLS & POLICIES
-----------------------
alter table public.leads enable row level security;
alter table public.leads force row level security;

-- SELECT POLICY: Admins read all, counselors read own+team
create policy if not exists leads_select_by_role
on public.leads
for select using (
  (auth.jwt() ->> 'role') = 'admin'
  or (
    (auth.jwt() ->> 'role') = 'counselor'
    and (
      owner_id = auth.uid()
      or team_id in (select team_id from user_teams where user_id = auth.uid())
    )
  )
);

-- INSERT POLICY
create policy if not exists leads_insert_by_role
on public.leads
for insert with check (
  (auth.jwt() ->> 'role') = 'admin'
  or (
    (auth.jwt() ->> 'role') = 'counselor'
    and (
      owner_id = auth.uid()
      or team_id in (select team_id from user_teams where user_id = auth.uid())
    )
  )
);
