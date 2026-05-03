import { notFound } from "next/navigation";

import { WorkflowChecklistFull } from "@/components/home/workflow-checklist-full";
import { ProjectPipelineFilesViewSection } from "@/components/projects/project-pipeline-files-view";
import type { WorkflowProjectRow } from "@/lib/home-workflow-data";
import { isDriveConfigured } from "@/lib/google-drive-server";
import { loadProjectPipelineFilesForView } from "@/lib/project-pipeline-files";
import { formatProjectType } from "@/lib/project-types";
import { resolveShareTokenToProjectId } from "@/lib/project-share";
import { loadProjectDetail, type TrackedProjectDetail } from "@/lib/projects-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatIsoDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function toWorkflowRow(project: TrackedProjectDetail): WorkflowProjectRow {
  return {
    id: project.id,
    title: project.title,
    status: project.status,
    priority: project.priority,
    project_type: project.project_type,
    workflow_checklist: project.workflow_checklist,
    registered_client_id: project.registered_client_id,
    registered_clients: project.registered_clients,
    timeline_summary: "—",
  };
}

export default async function PublicShareProjectPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const resolved = await resolveShareTokenToProjectId(token);
  if (!resolved.ok) {
    notFound();
  }

  const { project, error } = await loadProjectDetail(resolved.projectId);
  if (!project) {
    notFound();
  }

  let pipelineFilesResult: Awaited<ReturnType<typeof loadProjectPipelineFilesForView>> | null = null;
  if (isDriveConfigured() && project.google_drive_folder_id) {
    pipelineFilesResult = await loadProjectPipelineFilesForView(project.google_drive_folder_id);
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-dash-foreground text-2xl font-semibold tracking-tight">{project.title}</h1>
        <p className="text-dash-muted-foreground mt-1 text-sm">
          {project.registered_clients?.name ?? "Client"} · shared read-only
        </p>
      </div>

      {error ? (
        <p className="text-dash-muted-foreground mb-4 text-sm">{error}</p>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-3 text-xs font-medium capitalize">
        <span className="border-dash-border rounded-full border px-3 py-1">{project.status.replace(/_/g, " ")}</span>
        <span className="border-dash-border rounded-full border px-3 py-1">{project.priority} priority</span>
        <span className="border-dash-border rounded-full border px-3 py-1">
          {formatProjectType(project.project_type)}
        </span>
      </div>

      {project.start_date || project.target_end_date ? (
        <p className="text-dash-muted-foreground mb-6 text-sm">
          {formatIsoDate(project.start_date) ? (
            <span>
              Start: <span className="text-dash-foreground font-medium">{formatIsoDate(project.start_date)}</span>
            </span>
          ) : null}
          {project.start_date && project.target_end_date ? <span> · </span> : null}
          {formatIsoDate(project.target_end_date) ? (
            <span>
              Target end:{" "}
              <span className="text-dash-foreground font-medium">{formatIsoDate(project.target_end_date)}</span>
            </span>
          ) : null}
        </p>
      ) : null}

      {project.description ? (
        <p className="text-dash-muted-foreground mb-8 max-w-3xl text-sm leading-relaxed">{project.description}</p>
      ) : null}

      <section
        id="activity-checklist"
        className="border-dash-border bg-dash-card mb-10 scroll-mt-28 rounded-2xl border p-5 shadow-sm sm:p-6"
        aria-labelledby="share-activity-heading"
      >
        <h2 id="share-activity-heading" className="text-dash-foreground mb-1 text-lg font-semibold">
          Activity checklist
        </h2>
        <p className="text-dash-muted-foreground mb-5 text-sm">Pipeline steps (view only).</p>
        <WorkflowChecklistFull readOnly projects={[toWorkflowRow(project)]} />
      </section>

      {!isDriveConfigured() ? (
        <section className="border-dash-border bg-dash-muted/30 mb-10 rounded-2xl border border-dashed px-5 py-6">
          <p className="text-dash-foreground text-sm font-medium">Files are not available on this link right now.</p>
          <p className="text-dash-muted-foreground mt-1 text-sm">The host has not configured Google Drive for previews.</p>
        </section>
      ) : !project.google_drive_folder_id ? (
        <section className="border-dash-border bg-dash-muted/30 mb-10 rounded-2xl border border-dashed px-5 py-6">
          <p className="text-dash-foreground text-sm font-medium">No project folder linked yet</p>
          <p className="text-dash-muted-foreground mt-1 text-sm">Files will appear here once the team links Drive.</p>
        </section>
      ) : pipelineFilesResult && !pipelineFilesResult.ok ? (
        <div
          role="alert"
          className="border-red-500/30 bg-red-500/10 text-red-950 dark:text-red-100 mb-10 rounded-2xl border px-4 py-3 text-sm"
        >
          <p className="font-medium">Could not load files</p>
          <p className="mt-1 opacity-90">{pipelineFilesResult.error}</p>
        </div>
      ) : pipelineFilesResult?.ok ? (
        <ProjectPipelineFilesViewSection
          projectId={project.id}
          activities={pipelineFilesResult.activities}
          shareToken={token}
        />
      ) : null}

      <p className="text-dash-muted-foreground text-center text-xs">
        This is a private share link. Do not forward unless you intend to share project visibility.
      </p>
    </>
  );
}
