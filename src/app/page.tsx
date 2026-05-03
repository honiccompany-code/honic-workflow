import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatusBanner } from "@/components/dashboard/status-banner";
import { HomeSummaryCards } from "@/components/home/home-summary-cards";
import { WorkflowTableMinimal } from "@/components/home/workflow-table-minimal";
import { isDashboardRegistryOk } from "@/lib/dashboard-types";
import { loadHomeWorkflowPage } from "@/lib/home-workflow-data";

/** Core product: fresh Supabase data every request (not prerendered static HTML). */
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { banner, projects, summaries } = await loadHomeWorkflowPage();

  const connected = isDashboardRegistryOk(banner);
  const statusDotClass = connected ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]" : "bg-amber-500";

  return (
    <DashboardShell
      title="Project workflow"
      subtitle="Summary table on home · full checklist on each project."
      statusDotClass={statusDotClass}
    >
      <StatusBanner banner={banner} />

      <section id="overview" className="mt-6 scroll-mt-28 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-dash-foreground text-lg font-semibold tracking-tight">Summary</h2>
            <p className="text-dash-muted-foreground text-sm">
              Registry size, delivery status, and pipeline at a glance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/projects/new"
              className="bg-dash-accent text-slate-950 hover:bg-dash-accent-dim rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
            >
              New project
            </Link>
            <p className="text-dash-muted-foreground text-xs font-medium tabular-nums">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <HomeSummaryCards s={summaries} />
      </section>

      <section id="workflow" className="mt-10 scroll-mt-28 space-y-4">
        <div>
          <h2 className="text-dash-foreground text-lg font-semibold tracking-tight">Activity overview</h2>
          <p className="text-dash-muted-foreground mt-1 max-w-3xl text-sm">
            Key status per project.{" "}
            <span className="font-medium text-dash-foreground">Pipeline</span> counts checklist progress (steps marked{" "}
            <span className="font-medium text-dash-foreground">outside our scope</span> are someone else’s deliverable,
            not ours to finish); <span className="font-medium text-dash-foreground">Timeline</span> shows dates and
            milestones. View for read-only summary; Manage to edit pipeline and tasks.
          </p>
        </div>
        <WorkflowTableMinimal projects={projects} />
      </section>

      <footer className="text-dash-muted-foreground mt-12 border-t border-dashed border-slate-300/60 pt-8 text-center text-xs dark:border-slate-600/60">
        <span className="font-medium text-slate-600 dark:text-slate-400">tracked_projects.workflow_checklist</span>
        {" · "}
        <Link href="/projects" className="text-dash-accent font-medium underline-offset-2 hover:underline">
          Project list
        </Link>
        {" · "}
        <Link href="/about" className="text-dash-accent font-medium underline-offset-2 hover:underline">
          About
        </Link>
      </footer>
    </DashboardShell>
  );
}
