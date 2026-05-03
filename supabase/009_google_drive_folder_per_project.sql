-- Optional Google Drive folder per tracked project (under GOOGLE_DRIVE_FOLDER_ID tree).
-- Run in Supabase SQL Editor after prior migrations.

alter table public.tracked_projects
  add column if not exists google_drive_folder_id text;

comment on column public.tracked_projects.google_drive_folder_id is
  'Drive folder ID for this project files (child of env-linked folder, or validated descendant).';
