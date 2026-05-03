-- Your `public.invoices` table already exists in Supabase.
-- Run this after invoices + indexes exist. Enables dashboard reads of distinct client names.

-- For trigram index gin(client_name gin_trgm_ops); skip if you already enabled it.
create extension if not exists pg_trgm;

-- Distinct names only (trimmed), sorted — exposed to PostgREST as RPC.
create or replace function public.get_distinct_invoice_client_names()
returns table (client_name text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct trim(i.client_name) as client_name
  from public.invoices i
  where i.client_name is not null
    and trim(i.client_name) <> ''
  order by 1;
$$;

grant execute on function public.get_distinct_invoice_client_names() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- If Row Level Security is enabled on `invoices` and the dashboard cannot
-- read rows, add a policy (adjust USING (...) for production).
--
-- alter table public.invoices enable row level security;
--
-- drop policy if exists "invoices_select_dashboard" on public.invoices;
-- create policy "invoices_select_dashboard"
--   on public.invoices for select
--   to anon, authenticated
--   using (true);
-- ---------------------------------------------------------------------------
