-- Expanded project types for tracked_projects (FYP, research, prototypes, product, MVP).
-- Run after 006_project_tracking.sql. Safe to re-run if constraint name differs (adjust drop).

-- Map old enum-style values to new ones
update public.tracked_projects
set project_type = 'student_fyp'
where project_type = 'student_final';

update public.tracked_projects
set project_type = 'product_prototype'
where project_type = 'prototype';

-- Drop existing CHECK on project_type (PostgreSQL auto-name may vary — try common pattern)
alter table public.tracked_projects
  drop constraint if exists tracked_projects_project_type_check;

-- Recreate with full set
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
