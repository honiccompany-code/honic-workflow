import Link from "next/link";
import { notFound } from "next/navigation";

import { WorkflowChecklistFull } from "@/components/home/workflow-checklist-full";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProjectDriveUploadForm } from "@/components/projects/project-drive-upload-form";
import { ProjectTasksPanel } from "@/components/projects/project-tasks-panel";
import { loadDashboardData } from "@/lib/dashboard-data";
import type { WorkflowProjectRow } from "@/lib/home-workflow-data";
import { formatProjectType } from "@/lib/project-types";
import { isDashboardRegistryOk } from "@/lib/dashboard-types";
import { getPublicSiteBaseUrl } from "@/app/projects/[id]/share-actions";
import { ProjectShareLinkPanel } from "@/components/projects/project-share-link-panel";
import { buildShareLinkOrigin } from "@/lib/share-link-origin";
import { isDriveConfigured } from "@/lib/google-drive-server";
import { listShareLinksForProject } from "@/lib/project-share";
import { loadProjectDetail, type TrackedProjectDetail } from "@/lib/projects-data";

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

export default async function ProjectWorkPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const dash = await loadDashboardData();
  const { project, milestones, tasks, error } = await loadProjectDetail(id);

  if (!project) {
    notFound();
  }

  const connected = isDashboardRegistryOk(dash.banner);
  const statusDotClass = connected
    ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]"
    : "bg-amber-500";

  const driveReady = isDriveConfigured();
  const projectDriveFolderId = project.google_drive_folder_id;
  const shareLinks = await listShareLinksForProject(project.id);
  const fallbackOrigin = await getPublicSiteBaseUrl();
  const shareLinkOrigin = buildShareLinkOrigin(project.registered_clients, fallbackOrigin);

  return (
    <DashboardShell
      title={project.title}
      subtitle={`${project.registered_clients?.name ?? "Registered client"} · Manage progress`}
      statusDotClass={statusDotClass}
    >
      <p className="text-dash-muted-foreground mb-6 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        <Link
          href={`/projects/${project.id}`}
          className="text-dash-accent font-semibold underline-offset-2 hover:underline"
        >
          Open view-only summary
        </Link>
        <span className="text-dash-border hidden sm:inline">|</span>
        <Link href="/projects" className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          All projects
        </Link>
      </p>

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

      <ProjectShareLinkPanel projectId={project.id} existingLinks={shareLinks} shareLinkOrigin={shareLinkOrigin} />

      <section
        id="activity-checklist"
        className="border-dash-border bg-dash-card mb-10 scroll-mt-28 rounded-2xl border p-5 shadow-sm sm:p-6"
        aria-labelledby="work-checklist-heading"
      >
        <h2 id="work-checklist-heading" className="text-dash-foreground mb-1 text-lg font-semibold">
          Pipeline & activity
        </h2>
        <p className="text-dash-muted-foreground mb-5 text-sm">
          Update each step from schematic through handoff (saved immediately). Use <span className="text-dash-foreground font-medium">Outside our scope</span>{" "}
          when your team does not deliver that step (another party provides it)—those steps are skipped for completion,
          not treated as pending work. A progress bar below shows live counts;{" "}
          <span className="text-dash-foreground font-medium">View summary page →</span> opens the read-only overview.
        </p>
        <WorkflowChecklistFull projects={[toWorkflowRow(project)]} />
      </section>

      {driveReady && projectDriveFolderId ? (
        <ProjectDriveUploadForm
          projectId={project.id}
          heading="Upload files to this project"
          intro="Upload a new file, or switch to “Use file already in project folder” to open the client project folder, pick an existing file, and move it into the pipeline activity subfolder (same steps as above)."
        />
      ) : driveReady && !projectDriveFolderId ? (
        <div
          role="status"
          className="border-dash-border bg-dash-muted/30 mb-8 rounded-2xl border border-dashed px-5 py-6"
        >
          <p className="text-dash-foreground text-sm font-medium">Connect a Drive folder to upload files.</p>
          <p className="text-dash-muted-foreground mt-1 text-sm">
            Configure the project folder on the Files page, then uploads here and there will work.
          </p>
          <Link
            href={`/projects/${project.id}/files`}
            className="text-dash-accent mt-3 inline-block text-sm font-semibold underline-offset-2 hover:underline"
          >
            Open Files &amp; Drive setup →
          </Link>
        </div>
      ) : (
        <div
          role="status"
          className="border-dash-border bg-dash-muted/30 mb-8 rounded-2xl border border-dashed px-5 py-6"
        >
          <p className="text-dash-foreground text-sm font-medium">Drive uploads are not configured.</p>
          <p className="text-dash-muted-foreground mt-1 text-sm">
            Set service account and folder env vars to enable uploads from Manage and Files.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="border-dash-border bg-dash-card rounded-2xl border p-5 shadow-sm">
          <h2 className="text-dash-foreground mb-1 text-base font-semibold">Timeline</h2>
          <p className="text-dash-muted-foreground mb-4 text-xs">
            Milestones set at project creation. Dates and completion can be adjusted later via the database or a future
            editor.
          </p>
          {milestones.length === 0 ? (
            <p className="text-dash-muted-foreground text-sm">
              No milestones yet. Add them when you create a project.
            </p>
          ) : (
            <ul className="relative space-y-0 pl-1 text-sm before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-dash-border">
              {milestones.map((m) => (
                <li key={m.id} className="relative flex gap-3 pb-5 last:pb-0">
                  <span
                    className="bg-dash-accent mt-1.5 h-2 w-2 shrink-0 rounded-full ring-2 ring-dash-card"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-dash-foreground font-medium">{m.title}</p>
                    <p className="text-dash-muted-foreground mt-0.5 text-xs tabular-nums">
                      {m.completed_at
                        ? `Completed ${new Date(m.completed_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                        : m.target_date
                          ? `Target ${formatIsoDate(m.target_date) ?? m.target_date}`
                          : "No target date"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-dash-border bg-dash-card rounded-2xl border p-5 shadow-sm">
          <h2 className="text-dash-foreground mb-1 text-base font-semibold">Tasks</h2>
          <p className="text-dash-muted-foreground mb-4 text-xs">Add tasks and set status; updates save to the project.</p>
          <ProjectTasksPanel projectId={project.id} tasks={tasks} />
        </section>
      </div>

      <p className="text-dash-muted-foreground mt-10 flex flex-wrap gap-4 text-xs">
        <Link href={`/projects/${project.id}`} className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          View summary
        </Link>
        <Link href="/projects" className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          All projects
        </Link>
        <Link href="/" className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          Home
        </Link>
      </p>
    </DashboardShell>
  );
}
