-- PostgreSQL functions (RPC via Supabase) + nested procedures (CALL chain).

-- 1) Core refresh for one client (called by others)
create or replace procedure public.refresh_single_client_counts(p_client_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clients c
  set
    total_projects = (
      select count(*)::int from public.projects p where p.client_id = p_client_id
    ),
    active_projects = (
      select count(*)::int from public.projects p
      where p.client_id = p_client_id
        and p.status not in ('completed', 'on_hold')
    ),
    updated_at = now()
  where c.id = p_client_id;
end;
$$;

-- 2) Nested: refresh every client by calling refresh_single_client_counts in a loop
create or replace procedure public.refresh_all_client_counts()
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in select id from public.clients loop
    call public.refresh_single_client_counts(r.id);
  end loop;
end;
$$;

-- 3) Dashboard RPC: stable read shape for the Next.js dashboard
create or replace function public.get_dashboard_clients()
returns table (
  id uuid,
  name text,
  organization text,
  status text,
  active_projects integer,
  total_projects integer,
  priority text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.organization,
    c.status,
    c.active_projects,
    c.total_projects,
    c.priority,
    c.updated_at
  from public.clients c
  order by c.updated_at desc;
$$;

-- 4) Convenience: add a project and refresh counts via nested procedure
create or replace function public.create_project_for_client(
  p_client_id uuid,
  p_title text,
  p_status text default 'planning'
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.projects (client_id, title, status)
  values (p_client_id, p_title, p_status)
  returning id into v_id;

  -- Trigger already updates counts; this CALL reconciles if triggers ever skipped
  call public.refresh_single_client_counts(p_client_id);

  return v_id;
end;
$$;

-- Grants for Supabase roles --------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on table public.clients to anon, authenticated;
grant select on table public.projects to anon, authenticated;

grant insert, update on table public.clients to authenticated;
grant insert, update, delete on table public.projects to authenticated;

grant execute on function public.get_dashboard_clients() to anon, authenticated;
grant execute on function public.create_project_for_client(uuid, text, text) to authenticated;

-- SECURITY DEFINER maintenance: SQL editor (postgres) or Supabase service_role only
revoke all on procedure public.refresh_single_client_counts(uuid) from public;
revoke all on procedure public.refresh_all_client_counts() from public;
grant execute on procedure public.refresh_single_client_counts(uuid) to service_role;
grant execute on procedure public.refresh_all_client_counts() to service_role;
