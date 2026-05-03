-- Optional DNS label for client-branded share links: https://{share_subdomain}.{parent}/share/{token}
-- When null, the app derives `{slugify(name)}-api` if NEXT_PUBLIC_SHARE_PARENT_DOMAIN is set.

alter table public.registered_clients
  add column if not exists share_subdomain text null;

comment on column public.registered_clients.share_subdomain is
  'Optional hostname label (e.g. hosea-api). Must be unique when set. Lowercase a-z, 0-9, hyphen; max 63 chars.';

create unique index if not exists registered_clients_share_subdomain_lower_uk
  on public.registered_clients (lower(share_subdomain))
  where share_subdomain is not null and length(trim(share_subdomain)) > 0;

alter table public.registered_clients
  drop constraint if exists registered_clients_share_subdomain_chk;

alter table public.registered_clients
  add constraint registered_clients_share_subdomain_chk
  check (
    share_subdomain is null
    or (
      length(share_subdomain) between 3 and 63
      and share_subdomain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
    )
  );
