import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DriveFilePreview } from "@/components/drive/drive-file-preview";
import {
  assertShareFileInProjectFolder,
  resolveShareTokenToProjectId,
} from "@/lib/project-share";
import { loadProjectDetail } from "@/lib/projects-data";
import { getDriveItemMeta, isDriveConfigured } from "@/lib/google-drive-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PublicShareFileViewPage(props: {
  params: Promise<{ token: string; fileId: string }>;
}) {
  const { token, fileId: raw } = await props.params;
  const fileId = decodeURIComponent(raw);

  const resolved = await resolveShareTokenToProjectId(token);
  if (!resolved.ok) {
    notFound();
  }

  if (!isDriveConfigured()) {
    notFound();
  }

  const { project } = await loadProjectDetail(resolved.projectId);
  const folderId = project?.google_drive_folder_id;
  if (!folderId) {
    notFound();
  }

  const allowed = await assertShareFileInProjectFolder(folderId, fileId);
  if (!allowed) {
    notFound();
  }

  const meta = await getDriveItemMeta(fileId);
  if (!meta.ok) {
    notFound();
  }

  if (meta.isFolder) {
    redirect(`/share/${encodeURIComponent(token)}`);
  }

  const fileApiBasePath = `/api/share/${encodeURIComponent(token)}/file`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-dash-border from-dash-card to-dash-muted/20 mb-6 rounded-3xl border bg-gradient-to-br p-5 shadow-sm sm:p-6">
        <h1 className="text-dash-foreground text-xl font-bold tracking-tight text-balance sm:text-2xl">{meta.name}</h1>
        <p className="text-dash-muted-foreground mt-2 text-sm">Shared file — preview and download only.</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href={`/share/${encodeURIComponent(token)}`}
            className="border-dash-border bg-dash-card text-dash-foreground hover:border-dash-accent/40 focus-visible:ring-dash-accent inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-center text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            ← Back to project
          </Link>
          <a
            href={`${fileApiBasePath}/${encodeURIComponent(fileId)}?download=1`}
            download={meta.name}
            className="border-dash-border bg-dash-accent/15 text-dash-accent-dim hover:bg-dash-accent/25 focus-visible:ring-dash-accent inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-center text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Download
          </a>
        </div>
      </div>

      <div className="border-dash-border bg-dash-card/80 flex min-h-[50vh] flex-1 flex-col overflow-hidden rounded-3xl border shadow-sm sm:min-h-[60vh]">
        <DriveFilePreview
          mimeType={meta.mimeType}
          fileId={fileId}
          fileName={meta.name}
          fileApiBasePath={fileApiBasePath}
        />
      </div>
    </div>
  );
}
