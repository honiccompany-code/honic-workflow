-- Row Level Security: tune for production (restrict anon/authenticated as needed).

alter table public.clients enable row level security;
alter table public.projects enable row level security;

drop policy if exists "clients_select_dashboard" on public.clients;
create policy "clients_select_dashboard"
  on public.clients for select
  to anon, authenticated
  using (true);

drop policy if exists "projects_select_dashboard" on public.projects;
create policy "projects_select_dashboard"
  on public.projects for select
  to anon, authenticated
  using (true);

-- Allow inserts/updates from authenticated users only (optional starter)
drop policy if exists "clients_write_authenticated" on public.clients;
drop policy if exists "clients_update_authenticated" on public.clients;

create policy "clients_write_authenticated"
  on public.clients for insert
  to authenticated
  with check (true);

create policy "clients_update_authenticated"
  on public.clients for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "projects_write_authenticated" on public.projects;
drop policy if exists "projects_update_authenticated" on public.projects;
drop policy if exists "projects_delete_authenticated" on public.projects;

create policy "projects_write_authenticated"
  on public.projects for insert
  to authenticated
  with check (true);

create policy "projects_update_authenticated"
  on public.projects for update
  to authenticated
  using (true)
  with check (true);

create policy "projects_delete_authenticated"
  on public.projects for delete
  to authenticated
  using (true);
