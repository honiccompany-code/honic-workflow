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
    <>
      <div className="mb-6">
        <h1 className="text-dash-foreground text-xl font-semibold tracking-tight">{meta.name}</h1>
        <p className="text-dash-muted-foreground mt-1 text-sm">Shared file — preview and download only.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href={`/share/${encodeURIComponent(token)}`}
          className="text-dash-accent text-sm font-semibold underline-offset-2 hover:underline"
        >
          ← Back to project
        </Link>
        <a
          href={`${fileApiBasePath}/${encodeURIComponent(fileId)}?download=1`}
          download={meta.name}
          className="text-dash-accent text-sm font-semibold underline-offset-2 hover:underline"
        >
          Download
        </a>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <DriveFilePreview
          mimeType={meta.mimeType}
          fileId={fileId}
          fileName={meta.name}
          fileApiBasePath={fileApiBasePath}
        />
      </div>
    </>
  );
}
