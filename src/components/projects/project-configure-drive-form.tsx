"use client";

import { configureProjectDriveFolder } from "@/app/projects/actions";
import { ProjectDriveFolderFields } from "@/components/projects/project-drive-folder-fields";

export function ProjectConfigureDriveForm({ projectId }: { projectId: string }) {
  return (
    <form action={configureProjectDriveFolder} className="border-dash-border bg-dash-muted/20 mb-8 space-y-5 rounded-2xl border border-dashed p-6">
      <input type="hidden" name="tracked_project_id" value={projectId} />
      <ProjectDriveFolderFields variant="configure-project" />
      <button
        type="submit"
        className="bg-dash-accent hover:bg-dash-accent-dim rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors"
      >
        Save Drive folder
      </button>
    </form>
  );
}
