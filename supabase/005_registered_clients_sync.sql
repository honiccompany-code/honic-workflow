-- Registered client names: mirrored from invoices.client_name via trigger + optional backfill.
-- Run after `public.invoices` exists.
--
-- Flow: INSERT/UPDATE on invoices → upsert trimmed name into registered_clients.
-- Dashboard reads registered_clients (not invoices directly).

create table if not exists public.registered_clients (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint registered_clients_name_uk unique (name)
);

create index if not exists registered_clients_last_seen_idx
  on public.registered_clients using btree (last_seen_at desc);

-- Runs as definer so inserts succeed even when RLS blocks direct anon INSERT.
create or replace function public.tg_invoices_sync_registered_client ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n text;
begin
  n := trim(coalesce(new.client_name, ''));

  if length(n) = 0 then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and trim(coalesce(old.client_name, '')) is not distinct from n then
    return new;
  end if;

  insert into public.registered_clients (name)
  values (n)
  on conflict (name) do update set
    last_seen_at = now();

  return new;
end;
$$;

drop trigger if exists trg_invoices_sync_registered_client on public.invoices;

create trigger trg_invoices_sync_registered_client
after insert or update of client_name on public.invoices for each row
execute procedure public.tg_invoices_sync_registered_client ();

-- One-time merge from existing invoices (safe to re-run).
insert into public.registered_clients (name, first_seen_at, last_seen_at)
select
  trim(i.client_name) as name,
  min(i.created_at) as first_seen_at,
  max(i.updated_at) as last_seen_at
from public.invoices i
where i.client_name is not null
  and trim(i.client_name) <> ''
group by trim(i.client_name)
on conflict (name) do update set
  first_seen_at = least(
    public.registered_clients.first_seen_at,
    excluded.first_seen_at
  ),
  last_seen_at = greatest(
    public.registered_clients.last_seen_at,
    excluded.last_seen_at
  );

-- RLS: dashboard reads; writes happen via trigger (security definer).
alter table public.registered_clients enable row level security;

drop policy if exists "registered_clients_select_dashboard" on public.registered_clients;

create policy "registered_clients_select_dashboard"
on public.registered_clients for select to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;

grant select on table public.registered_clients to anon, authenticated;

-- RPC for PostgREST / Next.js
create or replace function public.get_registered_clients_for_dashboard ()
returns table (
  id uuid,
  name text,
  first_seen_at timestamptz,
  last_seen_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    r.id,
    r.name,
    r.first_seen_at,
    r.last_seen_at
  from public.registered_clients r
  order by r.last_seen_at desc;
$$;

grant execute on function public.get_registered_clients_for_dashboard () to anon, authenticated;
