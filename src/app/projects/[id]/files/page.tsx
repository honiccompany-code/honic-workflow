import Link from "next/link";
import { notFound } from "next/navigation";

import { DriveExplorerTable } from "@/components/drive/drive-explorer-table";
import { ProjectConfigureDriveForm } from "@/components/projects/project-configure-drive-form";
import { ProjectDriveUploadForm } from "@/components/projects/project-drive-upload-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { loadDashboardData } from "@/lib/dashboard-data";
import { isDriveConfigured, listDriveFolder } from "@/lib/google-drive-server";
import { loadProjectDetail } from "@/lib/projects-data";
import { isDashboardRegistryOk } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ProjectFilesPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const dash = await loadDashboardData();
  const { project } = await loadProjectDetail(id);

  if (!project) {
    notFound();
  }

  const connected = isDashboardRegistryOk(dash.banner);
  const statusDotClass = connected
    ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]"
    : "bg-amber-500";

  const driveReady = isDriveConfigured();
  const folderId = project.google_drive_folder_id;

  let listResult = null as Awaited<ReturnType<typeof listDriveFolder>> | null;
  if (driveReady && folderId) {
    listResult = await listDriveFolder({ parentFolderId: folderId });
  }

  return (
    <DashboardShell
      title={`${project.title} · Files`}
      subtitle="Google Drive folder for this client project."
      statusDotClass={statusDotClass}
    >
      {!driveReady ? (
        <div
          role="status"
          className="border-dash-border bg-dash-muted/30 rounded-2xl border border-dashed px-5 py-10 text-center"
        >
          <p className="text-dash-foreground font-medium">Drive is not configured.</p>
          <p className="text-dash-muted-foreground mt-2 text-sm">
            Set <code className="text-dash-foreground text-xs">GOOGLE_SERVICE_ACCOUNT_JSON</code> and{" "}
            <code className="text-dash-foreground text-xs">GOOGLE_DRIVE_FOLDER_ID</code> in{" "}
            <code className="text-dash-foreground text-xs">.env.local</code>.
          </p>
        </div>
      ) : !folderId ? (
        <ProjectConfigureDriveForm projectId={project.id} />
      ) : listResult && !listResult.ok ? (
        <div
          role="alert"
          className="border-red-500/30 bg-red-500/10 text-red-950 dark:text-red-100 mb-6 rounded-2xl border px-4 py-3 text-sm"
        >
          <p className="font-medium">Could not list folder</p>
          <p className="mt-1 opacity-90">{listResult.error}</p>
        </div>
      ) : listResult?.ok ? (
        <>
          <ProjectDriveUploadForm projectId={project.id} />
          <DriveExplorerTable files={listResult.files} />
        </>
      ) : null}

      <p className="text-dash-muted-foreground mt-10 flex flex-wrap gap-4 text-xs">
        <Link href={`/projects/${project.id}`} className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          Project overview
        </Link>
        <Link href="/projects" className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          All projects
        </Link>
      </p>
    </DashboardShell>
  );
}
