-- Public client share links: token maps to one project; used only by server (service role).
-- Run in Supabase SQL Editor after prior migrations.

create extension if not exists pgcrypto;

create table if not exists public.project_share_links (
  id uuid primary key default gen_random_uuid(),
  tracked_project_id uuid not null references public.tracked_projects (id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz null,
  label text null,
  constraint project_share_links_token_len check (char_length(token) >= 32),
  constraint project_share_links_token_unique unique (token)
);

create index if not exists project_share_links_token_idx on public.project_share_links using btree (token);
create index if not exists project_share_links_project_idx on public.project_share_links using btree (tracked_project_id);

comment on table public.project_share_links is 'Unlisted URLs for clients: /share/{token} shows one project summary + Drive files only.';
