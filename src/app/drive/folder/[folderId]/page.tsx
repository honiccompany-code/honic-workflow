import Link from "next/link";
import { notFound } from "next/navigation";

import { DriveExplorerTable } from "@/components/drive/drive-explorer-table";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { loadDashboardData } from "@/lib/dashboard-data";
import {
  getDriveItemMeta,
  isDriveConfigured,
  listDriveFolder,
  resolveDriveBackHrefFromParentId,
} from "@/lib/google-drive-server";
import { isDashboardRegistryOk } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DriveFolderPage(props: { params: Promise<{ folderId: string }> }) {
  const { folderId: raw } = await props.params;
  const folderId = decodeURIComponent(raw);

  const dash = await loadDashboardData();
  const connected = isDashboardRegistryOk(dash.banner);
  const statusDotClass = connected
    ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]"
    : "bg-amber-500";

  if (!isDriveConfigured()) {
    return (
      <DashboardShell title="Drive folder" subtitle="Not connected." statusDotClass={statusDotClass}>
        <Link href="/drive" className="text-dash-accent text-sm font-semibold underline-offset-2 hover:underline">
          Back to Drive
        </Link>
      </DashboardShell>
    );
  }

  const folderMeta = await getDriveItemMeta(folderId);
  if (!folderMeta.ok || !folderMeta.isFolder) {
    notFound();
  }

  const result = await listDriveFolder({ parentFolderId: folderId });
  if (!result.ok) {
    return (
      <DashboardShell title="Drive folder" subtitle="Could not list files." statusDotClass={statusDotClass}>
        <div
          role="alert"
          className="border-red-500/30 bg-red-500/10 text-red-950 dark:text-red-100 rounded-2xl border px-4 py-3 text-sm"
        >
          {result.error}
        </div>
        <Link href="/drive" className="text-dash-accent mt-6 inline-block text-sm font-semibold underline-offset-2 hover:underline">
          Back to Drive
        </Link>
      </DashboardShell>
    );
  }

  const linkedRoot = result.folderId;
  const backHref =
    folderId === linkedRoot ? null : await resolveDriveBackHrefFromParentId(folderMeta.parents[0]);

  return (
    <DashboardShell
      title={folderMeta.name}
      subtitle="Browse files inside this folder (in-app)."
      statusDotClass={statusDotClass}
    >
      <DriveExplorerTable files={result.files} backHref={backHref} />

      <p className="text-dash-muted-foreground mt-10 flex flex-wrap gap-4 text-xs">
        <Link href="/drive" className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          Top folder
        </Link>
        <Link href="/drive/upload" className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          Upload
        </Link>
      </p>
    </DashboardShell>
  );
}
