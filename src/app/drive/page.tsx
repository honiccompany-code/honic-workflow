import Link from "next/link";

import { DriveExplorerTable } from "@/components/drive/drive-explorer-table";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { loadDashboardData } from "@/lib/dashboard-data";
import { isDriveConfigured, listDriveFolder } from "@/lib/google-drive-server";
import { isDashboardRegistryOk } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";

export default async function DrivePage() {
  const dash = await loadDashboardData();
  const connected = isDashboardRegistryOk(dash.banner);
  const statusDotClass = connected
    ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]"
    : "bg-amber-500";

  const configured = isDriveConfigured();
  const result = configured ? await listDriveFolder() : null;

  return (
    <DashboardShell
      title="Google Drive"
      subtitle="Browse and open files in-app (proxied). Upload on Drive upload."
      statusDotClass={statusDotClass}
    >
      {!configured ? (
        <div
          role="status"
          className="border-dash-border bg-dash-muted/30 rounded-2xl border border-dashed px-5 py-10 text-center"
        >
          <p className="text-dash-foreground font-medium">Drive is not connected yet.</p>
          <p className="text-dash-muted-foreground mt-2 text-sm">
            Configure Drive credentials in <code className="text-dash-foreground text-xs">.env.local</code>, then reload
            this page.
          </p>
        </div>
      ) : result && !result.ok ? (
        <div
          role="alert"
          className="border-red-500/30 bg-red-500/10 text-red-950 dark:text-red-100 mb-6 rounded-2xl border px-4 py-3 text-sm"
        >
          <p className="font-medium">Could not list Drive</p>
          <p className="mt-1 opacity-90">{result.error}</p>
        </div>
      ) : result?.ok ? (
        <DriveExplorerTable files={result.files} />
      ) : null}

      <p className="text-dash-muted-foreground mt-10 flex flex-wrap gap-4 text-xs">
        <Link href="/drive/upload" className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          Drive upload
        </Link>
        <Link href="/" className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          Home
        </Link>
        <Link href="/projects" className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          Projects
        </Link>
      </p>
    </DashboardShell>
  );
}
