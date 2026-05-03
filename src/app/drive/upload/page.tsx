import Link from "next/link";

import { DriveUploadForm } from "@/components/drive/drive-upload-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { loadDashboardData } from "@/lib/dashboard-data";
import { isDriveConfigured } from "@/lib/google-drive-server";
import { isDashboardRegistryOk } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DriveUploadPage() {
  const dash = await loadDashboardData();
  const connected = isDashboardRegistryOk(dash.banner);
  const statusDotClass = connected
    ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]"
    : "bg-amber-500";

  const configured = isDriveConfigured();

  return (
    <DashboardShell
      title="Drive upload"
      subtitle="Send files into the shared Google Drive folder (service account)."
      statusDotClass={statusDotClass}
    >
      <section className="border-dash-border bg-dash-card mb-8 rounded-2xl border p-5 shadow-sm">
        <h2 className="text-dash-foreground mb-2 text-sm font-semibold">Before uploads work</h2>
        <ul className="text-dash-muted-foreground list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            In Google Drive, share <code className="text-dash-foreground text-xs">GOOGLE_DRIVE_FOLDER_ID</code> with the
            service account as <span className="text-dash-foreground font-medium">Editor</span> (Viewer is not enough to
            create files).
          </li>
          <li>
            Uploads use OAuth scope <code className="text-dash-foreground text-xs">drive</code> (read/write) on the
            server only; listing on <Link href="/drive" className="text-dash-accent font-medium underline-offset-2 hover:underline">/drive</Link> still
            uses <code className="text-dash-foreground text-xs">drive.readonly</code>.
          </li>
          <li>This dashboard has no per-user login yet; treat this page as internal-only when deployed.</li>
        </ul>
      </section>

      {!configured ? (
        <div
          role="status"
          className="border-dash-border bg-dash-muted/30 rounded-2xl border border-dashed px-5 py-10 text-center"
        >
          <p className="text-dash-foreground font-medium">Drive is not connected yet.</p>
          <p className="text-dash-muted-foreground mt-2 text-sm">
            Configure <code className="text-dash-foreground text-xs">GOOGLE_SERVICE_ACCOUNT_JSON</code> and{" "}
            <code className="text-dash-foreground text-xs">GOOGLE_DRIVE_FOLDER_ID</code> in{" "}
            <code className="text-dash-foreground text-xs">.env.local</code>, then reload.
          </p>
        </div>
      ) : (
        <DriveUploadForm />
      )}

      <p className="text-dash-muted-foreground mt-10 flex flex-wrap gap-4 text-xs">
        <Link href="/drive" className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          Drive browser
        </Link>
        <Link href="/" className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          Home
        </Link>
      </p>
    </DashboardShell>
  );
}
