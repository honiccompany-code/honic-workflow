-- Workflow checklist (JSONB) on each tracked project.
-- Run after 006_project_tracking.sql.
--
-- Keys used by the app (see src/lib/workflow-checklist.ts):
--   schematic_circuit, circuit_simulation, pcb_layout, pcb_fabrication,
--   programming, assembling_test, prototype, full_project_test,
--   client_check, give_to_client
-- Values: pending | in_progress | done | not_provided (other party provides step — out of scope for us; merged when missing).

alter table public.tracked_projects
  add column if not exists workflow_checklist jsonb not null default '{}'::jsonb;

comment on column public.tracked_projects.workflow_checklist is
  'Per-step workflow: schematic → … → give_to_client. JSON keys match workflow-checklist.ts';
