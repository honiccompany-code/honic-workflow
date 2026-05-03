-- Fix "violates check constraint tracked_projects_project_type_check".
-- Run in Supabase SQL Editor. Safe to re-run.
--
-- Order matters: drop the old CHECK first so UPDATEs are not blocked, and trim/fix
-- values (e.g. trailing spaces) so ADD CONSTRAINT can succeed.

-- 1) Drop ANY check constraint whose definition mentions project_type (name varies by PG version).
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'tracked_projects'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%project_type%'
  loop
    execute format('alter table public.tracked_projects drop constraint %I', r.conname);
  end loop;
end $$;

-- 2) Trim whitespace (hidden spaces cause 'student_fyp' to fail the IN list).
update public.tracked_projects
set project_type = trim(project_type)
where project_type is not null;

-- 3) Legacy value renames
update public.tracked_projects
set project_type = 'student_fyp'
where project_type = 'student_final';

update public.tracked_projects
set project_type = 'product_prototype'
where project_type = 'prototype';

-- 4) Anything still not in the app list → safe default
update public.tracked_projects
set project_type = 'product_prototype'
where project_type not in (
  'student_fyp',
  'research',
  'product_prototype',
  'product',
  'mvp',
  'other'
);

-- 5) Re-add constraint (validates all rows)
alter table public.tracked_projects
  add constraint tracked_projects_project_type_check
  check (
    project_type in (
      'student_fyp',
      'research',
      'product_prototype',
      'product',
      'mvp',
      'other'
    )
  );

alter table public.tracked_projects
  alter column project_type set default 'product_prototype';
