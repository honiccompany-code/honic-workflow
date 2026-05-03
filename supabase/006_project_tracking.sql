-- Project tracking tied to registered_clients (invoice-derived names).
-- Run after 005_registered_clients_sync.sql.

create extension if not exists pgcrypto;

create table if not exists public.tracked_projects (
  id uuid primary key default gen_random_uuid (),
  registered_client_id uuid not null references public.registered_clients (id) on delete cascade,
  title text not null,
  description text,
  project_type text not null default 'product_prototype'
    check (
      project_type in (
        'student_fyp',
        'research',
        'product_prototype',
        'product',
        'mvp',
        'other'
      )
    ),
  status text not null default 'planning'
    check (
      status in ('planning', 'active', 'prototype_phase', 'testing', 'on_hold', 'completed')
    ),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  start_date date,
  target_end_date date,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index if not exists tracked_projects_client_idx
  on public.tracked_projects using btree (registered_client_id);

create index if not exists tracked_projects_status_idx
  on public.tracked_projects using btree (status);

create index if not exists tracked_projects_updated_idx
  on public.tracked_projects using btree (updated_at desc);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid (),
  tracked_project_id uuid not null references public.tracked_projects (id) on delete cascade,
  title text not null,
  target_date date,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now ()
);

create index if not exists project_milestones_project_idx
  on public.project_milestones using btree (tracked_project_id, sort_order);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid (),
  tracked_project_id uuid not null references public.tracked_projects (id) on delete cascade,
  milestone_id uuid references public.project_milestones (id) on delete set null,
  title text not null,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'blocked', 'done')),
  assignee text,
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index if not exists project_tasks_project_idx
  on public.project_tasks using btree (tracked_project_id, sort_order);

create index if not exists project_tasks_open_idx
  on public.project_tasks using btree (tracked_project_id)
  where status <> 'done';

-- RLS ------------------------------------------------------------------------
alter table public.tracked_projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_tasks enable row level security;

drop policy if exists "tracked_projects_select" on public.tracked_projects;
create policy "tracked_projects_select"
on public.tracked_projects for select to anon, authenticated using (true);

drop policy if exists "tracked_projects_insert_auth" on public.tracked_projects;
create policy "tracked_projects_insert_auth"
on public.tracked_projects for insert to authenticated with check (true);

drop policy if exists "tracked_projects_update_auth" on public.tracked_projects;
create policy "tracked_projects_update_auth"
on public.tracked_projects for update to authenticated using (true) with check (true);

drop policy if exists "tracked_projects_delete_auth" on public.tracked_projects;
create policy "tracked_projects_delete_auth"
on public.tracked_projects for delete to authenticated using (true);

drop policy if exists "milestones_select" on public.project_milestones;
create policy "milestones_select"
on public.project_milestones for select to anon, authenticated using (true);

drop policy if exists "milestones_insert_auth" on public.project_milestones;
create policy "milestones_insert_auth"
on public.project_milestones for insert to authenticated with check (true);

drop policy if exists "milestones_update_auth" on public.project_milestones;
create policy "milestones_update_auth"
on public.project_milestones for update to authenticated using (true) with check (true);

drop policy if exists "milestones_delete_auth" on public.project_milestones;
create policy "milestones_delete_auth"
on public.project_milestones for delete to authenticated using (true);

drop policy if exists "tasks_select" on public.project_tasks;
create policy "tasks_select"
on public.project_tasks for select to anon, authenticated using (true);

drop policy if exists "tasks_insert_auth" on public.project_tasks;
create policy "tasks_insert_auth"
on public.project_tasks for insert to authenticated with check (true);

drop policy if exists "tasks_update_auth" on public.project_tasks;
create policy "tasks_update_auth"
on public.project_tasks for update to authenticated using (true) with check (true);

drop policy if exists "tasks_delete_auth" on public.project_tasks;
create policy "tasks_delete_auth"
on public.project_tasks for delete to authenticated using (true);

grant usage on schema public to anon, authenticated;

grant select on public.tracked_projects to anon, authenticated;
grant select on public.project_milestones to anon, authenticated;
grant select on public.project_tasks to anon, authenticated;

grant insert, update, delete on public.tracked_projects to authenticated;
grant insert, update, delete on public.project_milestones to authenticated;
grant insert, update, delete on public.project_tasks to authenticated;
