-- Run in Supabase SQL Editor (Project → SQL), in order: 001 → 002 → 003
-- Extends clients with optional fields; adds projects + automatic count sync.

create extension if not exists pgcrypto;

-- Clients ---------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization text,
  contact_email text,
  status text not null default 'new'
    check (status in ('new', 'active', 'on_hold', 'completed')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  active_projects integer not null default 0 check (active_projects >= 0),
  total_projects integer not null default 0 check (total_projects >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade path if an older `clients` table already existed without these columns
alter table public.clients add column if not exists organization text;
alter table public.clients add column if not exists contact_email text;
alter table public.clients add column if not exists notes text;
alter table public.clients add column if not exists created_at timestamptz not null default now();

-- Projects linked to clients (counts on clients are maintained by trigger)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  status text not null default 'planning'
    check (status in ('planning', 'active', 'prototype', 'testing', 'on_hold', 'completed')),
  phase text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists projects_client_id_idx on public.projects (client_id);
create index if not exists projects_status_idx on public.projects (status);
create index if not exists clients_updated_at_idx on public.clients (updated_at desc);

-- Keep denormalized counters in sync -----------------------------------------
create or replace function public.tg_refresh_client_counts()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  target uuid;
begin
  if tg_op = 'DELETE' then
    target := old.client_id;
  else
    target := new.client_id;
  end if;

  update public.clients c
  set
    total_projects = (
      select count(*)::int from public.projects p where p.client_id = target
    ),
    active_projects = (
      select count(*)::int from public.projects p
      where p.client_id = target
        and p.status not in ('completed', 'on_hold')
    ),
    updated_at = now()
  where c.id = target;

  if tg_op = 'UPDATE' and old.client_id is distinct from new.client_id then
    update public.clients c
    set
      total_projects = (
        select count(*)::int from public.projects p where p.client_id = old.client_id
      ),
      active_projects = (
        select count(*)::int from public.projects p
        where p.client_id = old.client_id
          and p.status not in ('completed', 'on_hold')
      ),
      updated_at = now()
    where c.id = old.client_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists projects_refresh_counts on public.projects;
create trigger projects_refresh_counts
  after insert or update or delete on public.projects
  for each row
  execute procedure public.tg_refresh_client_counts();

-- Seed (idempotent-ish: skip if names exist)
insert into public.clients (name, organization, status, priority, active_projects, total_projects)
select v.name, v.organization, v.status::text, v.priority::text, v.active_projects, v.total_projects
from (
  values
    ('DIT Electronics', 'DIT', 'active'::text, 'high'::text, 0, 0),
    ('SDM Labs', 'SDM', 'on_hold'::text, 'medium'::text, 0, 0),
    ('University Innovation Cell', 'University', 'new'::text, 'critical'::text, 0, 0)
) as v(name, organization, status, priority, active_projects, total_projects)
where not exists (
  select 1 from public.clients c where c.name = v.name
);

-- Sample projects (counts updated by trigger)
insert into public.projects (client_id, title, status)
select c.id, p.title, p.status::text
from public.clients c
cross join lateral (
  values
    ('Motor driver PCB — rev A', 'testing'),
    ('Firmware bring-up', 'active'),
    ('Sensor fusion demo', 'planning')
) as p(title, status)
where c.name = 'DIT Electronics'
  and not exists (
    select 1 from public.projects x where x.client_id = c.id and x.title = p.title
  );

insert into public.projects (client_id, title, status)
select c.id, p.title, p.status::text
from public.clients c
cross join lateral (
  values
    ('LoRa field trial', 'on_hold'),
    ('Documentation pack', 'completed')
) as p(title, status)
where c.name = 'SDM Labs'
  and not exists (
    select 1 from public.projects x where x.client_id = c.id and x.title = p.title
  );

insert into public.projects (client_id, title, status)
select c.id, 'Research proposal — wearable sensing'::text, 'planning'::text
from public.clients c
where c.name = 'University Innovation Cell'
  and not exists (
    select 1 from public.projects x where x.client_id = c.id and x.title = 'Research proposal — wearable sensing'
  );
