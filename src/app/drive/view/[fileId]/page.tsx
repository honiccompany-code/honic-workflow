import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DriveFilePreview } from "@/components/drive/drive-file-preview";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { loadDashboardData } from "@/lib/dashboard-data";
import {
  getDriveItemMeta,
  isDriveConfigured,
  resolveDriveBackHrefFromParentId,
} from "@/lib/google-drive-server";
import { isDashboardRegistryOk } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DriveViewPage(props: { params: Promise<{ fileId: string }> }) {
  const { fileId: raw } = await props.params;
  const fileId = decodeURIComponent(raw);

  const dash = await loadDashboardData();
  const connected = isDashboardRegistryOk(dash.banner);
  const statusDotClass = connected
    ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]"
    : "bg-amber-500";

  if (!isDriveConfigured()) {
    return (
      <DashboardShell title="Drive file" subtitle="Not connected." statusDotClass={statusDotClass}>
        <p className="text-dash-muted-foreground text-sm">
          Configure Drive in <code className="text-dash-foreground text-xs">.env.local</code>, then try again.
        </p>
        <Link href="/drive" className="text-dash-accent mt-4 inline-block text-sm font-semibold underline-offset-2 hover:underline">
          Back to Drive
        </Link>
      </DashboardShell>
    );
  }

  const meta = await getDriveItemMeta(fileId);
  if (!meta.ok) {
    notFound();
  }

  if (meta.isFolder) {
    redirect(`/drive/folder/${encodeURIComponent(fileId)}`);
  }

  const backHref = await resolveDriveBackHrefFromParentId(meta.parents[0]);

  return (
    <DashboardShell
      title={meta.name}
      subtitle="Preview and download here only."
      statusDotClass={statusDotClass}
    >
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href={backHref}
          className="text-dash-accent text-sm font-semibold underline-offset-2 hover:underline"
        >
          ← Back
        </Link>
        <a
          href={`/api/drive/file/${encodeURIComponent(fileId)}?download=1`}
          download={meta.name}
          className="text-dash-accent text-sm font-semibold underline-offset-2 hover:underline"
        >
          Download
        </a>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <DriveFilePreview mimeType={meta.mimeType} fileId={fileId} fileName={meta.name} />
      </div>
    </DashboardShell>
  );
}
