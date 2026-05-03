import Link from "next/link";

import type { WorkflowProjectRow } from "@/lib/home-workflow-data";
import { formatProjectType } from "@/lib/project-types";
import { workflowStepCounts } from "@/lib/workflow-checklist";

function formatProjectStatus(status: string) {
  return status.replace(/_/g, " ");
}

function priorityClass(priority: string) {
  if (priority === "critical") return "text-red-600 dark:text-red-400";
  if (priority === "high") return "text-orange-600 dark:text-orange-400";
  if (priority === "medium") return "text-sky-600 dark:text-sky-400";
  return "text-dash-muted-foreground";
}

export function WorkflowTableMinimal({ projects }: { projects: WorkflowProjectRow[] }) {
  if (projects.length === 0) {
    return (
      <div className="border-dash-border bg-dash-card text-dash-muted-foreground rounded-2xl border px-6 py-14 text-center text-sm">
        No projects yet.{" "}
        <Link href="/projects/new" className="text-dash-accent font-semibold underline-offset-2 hover:underline">
          Create a project
        </Link>{" "}
        to track activity here.
      </div>
    );
  }

  return (
    <div className="border-dash-border bg-dash-card overflow-hidden rounded-2xl border shadow-sm">
      <div className="overflow-x-auto">
        <table className="divide-dash-border min-w-[980px] w-full divide-y text-sm">
          <thead className="bg-dash-muted/90">
            <tr className="text-dash-muted-foreground text-left text-xs font-semibold tracking-wide uppercase">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Project</th>
              <th className="hidden px-4 py-3 sm:table-cell">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Pipeline</th>
              <th className="px-4 py-3 min-w-[200px]">Timeline</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-dash-border divide-y">
            {projects.map((p) => {
              const { done, inProgress, notProvided, total, inScopeTotal, addressed } = workflowStepCounts(
                p.workflow_checklist
              );
              return (
                <tr key={p.id} className="hover:bg-dash-muted/40">
                  <td className="text-dash-foreground px-4 py-3 font-medium whitespace-nowrap">
                    {p.registered_clients?.name ?? "—"}
                  </td>
                  <td className="text-dash-foreground max-w-[200px] truncate px-4 py-3">{p.title}</td>
                  <td className="text-dash-muted-foreground hidden max-w-[140px] truncate px-4 py-3 text-xs sm:table-cell">
                    {formatProjectType(p.project_type)}
                  </td>
                  <td className="text-dash-muted-foreground px-4 py-3 text-xs capitalize">
                    {formatProjectStatus(p.status)}
                  </td>
                  <td className={`px-4 py-3 text-xs font-semibold uppercase ${priorityClass(p.priority)}`}>
                    {p.priority}
                  </td>
                  <td
                    className="text-dash-foreground max-w-[220px] px-4 py-3 text-xs leading-snug tabular-nums sm:max-w-none"
                    title={
                      notProvided > 0
                        ? `${done}/${inScopeTotal} done on steps we deliver · ${notProvided} outside our scope · ${addressed}/${total} addressed on full board`
                        : undefined
                    }
                  >
                    <span className="font-medium">{done}</span>
                    <span className="text-dash-muted-foreground">/{inScopeTotal} done</span>
                    {inProgress > 0 ? (
                      <span className="text-dash-muted-foreground ml-1">· {inProgress} active</span>
                    ) : null}
                    {notProvided > 0 ? (
                      <>
                        <span className="text-dash-muted-foreground ml-1">· {notProvided} out of scope</span>
                        <span className="text-dash-muted-foreground ml-1">· {addressed}/{total}</span>
                      </>
                    ) : null}
                  </td>
                  <td className="text-dash-muted-foreground max-w-[260px] px-4 py-3 text-xs leading-snug">
                    {p.timeline_summary}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/projects/${p.id}#activity-checklist`}
                        className="border-dash-border bg-dash-muted hover:bg-dash-border inline-flex rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                      >
                        View
                      </Link>
                      <Link
                        href={`/projects/${p.id}/work#activity-checklist`}
                        className="bg-dash-accent text-slate-950 hover:bg-dash-accent-dim inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                      >
                        Manage
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-dash-muted-foreground border-dash-border border-t px-4 py-3 text-xs leading-relaxed">
        <p>
          <span className="text-dash-foreground font-medium">Pipeline</span> is the design handoff workflow (checklist
          steps). <span className="text-dash-foreground font-medium">Timeline</span> is the schedule: start/target dates
          and milestones (named checkpoints you plan to hit, often with target dates).{" "}
          <span className="text-dash-foreground font-medium">View</span> opens a read-only summary;{" "}
          <span className="text-dash-foreground font-medium">Manage</span> opens pipeline steps, tasks, and controls for
          that project. Steps marked <span className="text-dash-foreground font-medium">out of scope</span> are provided
          by someone else (e.g. client), not counted as work we still owe.
        </p>
      </div>
    </div>
  );
}
