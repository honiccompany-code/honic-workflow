"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { updateWorkflowStep } from "@/app/actions/workflow";
import type { WorkflowProjectRow } from "@/lib/home-workflow-data";
import {
  WORKFLOW_STEPS,
  normalizeWorkflowChecklist,
  workflowStepCounts,
  type WorkflowStepKey,
  type WorkflowStepStatus,
} from "@/lib/workflow-checklist";

const STATUS_OPTIONS: { value: WorkflowStepStatus; label: string }[] = [
  { value: "pending", label: "—" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  {
    value: "not_provided",
    label: "Outside our scope",
  },
];

function cellClass(status: WorkflowStepStatus) {
  if (status === "done") return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
  if (status === "in_progress") return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
  if (status === "not_provided")
    return "bg-slate-500/12 text-slate-700 dark:text-slate-300";
  return "bg-dash-muted text-dash-muted-foreground";
}

type StepPatches = Partial<Record<WorkflowStepKey, WorkflowStepStatus>>;

function statusLabel(s: WorkflowStepStatus) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? "—";
}

/** Full electronics pipeline checklist — one or more project rows. Used on project detail (single row). */
export function WorkflowChecklistFull({
  projects,
  readOnly = false,
}: {
  projects: WorkflowProjectRow[];
  /** When true (e.g. project view page), show step status as text — no editing. */
  readOnly?: boolean;
}) {
  const [stepPatches, setStepPatches] = useState<Record<string, StepPatches>>({});
  const [pending, startTransition] = useTransition();
  const [saveFlash, setSaveFlash] = useState<null | "saved" | "error">(null);
  const saveFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveFlashTimerRef.current) clearTimeout(saveFlashTimerRef.current);
    };
  }, []);

  /** Drop patch keys once server `projects` props match (e.g. after refresh); avoids stale revert when we used to clear patches before props updated. */
  useEffect(() => {
    if (readOnly) return;
    queueMicrotask(() => {
      setStepPatches((prev) => {
        let changed = false;
        const next: Record<string, StepPatches> = { ...prev };
        for (const p of projects) {
          const pid = p.id;
          if (!next[pid]) continue;
          const base = normalizeWorkflowChecklist(p.workflow_checklist);
          const patch = { ...next[pid] };
          for (const stepKey of Object.keys(patch) as WorkflowStepKey[]) {
            if ((base[stepKey] ?? "pending") === patch[stepKey]) {
              delete patch[stepKey];
              changed = true;
            }
          }
          if (Object.keys(patch).length === 0) {
            delete next[pid];
          } else {
            next[pid] = patch;
          }
        }
        return changed ? next : prev;
      });
    });
  }, [projects, readOnly]);

  function flashSaved(ok: boolean) {
    if (saveFlashTimerRef.current) clearTimeout(saveFlashTimerRef.current);
    setSaveFlash(ok ? "saved" : "error");
    saveFlashTimerRef.current = setTimeout(() => {
      setSaveFlash(null);
      saveFlashTimerRef.current = null;
    }, ok ? 2000 : 4000);
  }

  const rows = useMemo(() => {
    return projects.map((p) => {
      const base = normalizeWorkflowChecklist(p.workflow_checklist);
      if (readOnly) {
        return { project: p, checklist: base };
      }
      const patch = stepPatches[p.id];
      const merged = patch ? ({ ...base, ...patch } as Record<WorkflowStepKey, WorkflowStepStatus>) : base;
      return { project: p, checklist: merged };
    });
  }, [projects, readOnly, stepPatches]);

  function onStepChange(p: WorkflowProjectRow, stepKey: WorkflowStepKey, value: WorkflowStepStatus) {
    const before = normalizeWorkflowChecklist(p.workflow_checklist)[stepKey] ?? "pending";

    if (saveFlashTimerRef.current) {
      clearTimeout(saveFlashTimerRef.current);
      saveFlashTimerRef.current = null;
    }
    setSaveFlash(null);

    setStepPatches((prev) => ({
      ...prev,
      [p.id]: { ...prev[p.id], [stepKey]: value },
    }));

    startTransition(async () => {
      try {
        await updateWorkflowStep(p.id, stepKey, value);
        // Keep optimistic patches until `projects` props reflect the DB (see prune effect). Clearing here reverted the UI
        // because the parent Server Component does not refetch on every save.
        flashSaved(true);
      } catch {
        setStepPatches((prev) => ({
          ...prev,
          [p.id]: { ...prev[p.id], [stepKey]: before },
        }));
        flashSaved(false);
      }
    });
  }

  if (projects.length === 0) {
    return (
      <div className="border-dash-border bg-dash-card text-dash-muted-foreground rounded-2xl border px-6 py-10 text-center text-sm">
        No checklist data for this project.
      </div>
    );
  }

  /** Single-project views (e.g. project detail) already show client/title in the shell — hide redundant columns. */
  const showIdentityColumns = projects.length > 1;

  const singleEditableRow = !readOnly && rows.length === 1 ? rows[0] : null;
  const liveCounts = singleEditableRow ? workflowStepCounts(singleEditableRow.checklist) : null;

  return (
    <div className="border-dash-border bg-dash-card overflow-hidden rounded-2xl border shadow-sm">
      {liveCounts && singleEditableRow ? (
        <div className="border-dash-border bg-dash-muted/35 flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-dash-foreground text-sm">
              <span className="font-semibold tabular-nums">{liveCounts.done}</span>
              <span className="text-dash-muted-foreground">
                {liveCounts.inScopeTotal > 0 ? (
                  <>/{liveCounts.inScopeTotal} steps we deliver</>
                ) : (
                  <span> — all {liveCounts.total} steps outside our scope</span>
                )}
                {liveCounts.inProgress > 0 ? (
                  <span className="text-dash-muted-foreground">
                    {" "}
                    · {liveCounts.inProgress} in progress
                  </span>
                ) : null}
                {liveCounts.notProvided > 0 ? (
                  <span className="text-dash-muted-foreground">
                    {" "}
                    · {liveCounts.notProvided} outside our scope
                  </span>
                ) : null}
                {liveCounts.notProvided > 0 ? (
                  <span className="text-dash-muted-foreground">
                    {" "}
                    · {liveCounts.addressed}/{liveCounts.total} addressed
                  </span>
                ) : null}
              </span>
            </p>
            {liveCounts.notProvided > 0 ? (
              <p className="text-dash-muted-foreground text-xs">
                {liveCounts.total} steps on the board. Addressed = done + outside our scope (e.g. 5 + 2 = 7 of 10).
              </p>
            ) : null}
            <div
              className="bg-dash-border h-2 max-w-md overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={liveCounts.done}
              aria-valuemin={0}
              aria-valuemax={Math.max(1, liveCounts.inScopeTotal)}
            >
              <div
                className="bg-dash-accent h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${liveCounts.inScopeTotal > 0 ? Math.min(100, Math.round((liveCounts.done / liveCounts.inScopeTotal) * 100)) : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
            <Link
              href={`/projects/${singleEditableRow.project.id}`}
              className="text-dash-accent text-sm font-semibold underline-offset-2 hover:underline"
            >
              View summary page →
            </Link>
            <p className="text-dash-muted-foreground min-h-[1.125rem] text-xs" aria-live="polite">
              {pending ? (
                <span>Saving…</span>
              ) : saveFlash === "saved" ? (
                <span className="text-emerald-700 dark:text-emerald-300">Saved</span>
              ) : saveFlash === "error" ? (
                <span className="text-red-600 dark:text-red-400">Couldn’t save — try again</span>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table
          className={`divide-dash-border w-full divide-y text-xs sm:text-sm ${showIdentityColumns ? "min-w-[1100px]" : "min-w-[720px]"}`}
        >
          <thead className="bg-dash-muted/90">
            <tr className="text-dash-muted-foreground text-left font-semibold tracking-wide uppercase">
              {showIdentityColumns ? (
                <>
                  <th className="sticky left-0 z-10 bg-dash-muted/95 px-3 py-3 whitespace-nowrap backdrop-blur-sm sm:px-4">
                    Client
                  </th>
                  <th className="min-w-[140px] px-3 py-3 whitespace-nowrap sm:px-4">Project</th>
                </>
              ) : null}
              {WORKFLOW_STEPS.map((s) => (
                <th
                  key={s.key}
                  className="max-w-[120px] px-2 py-3 text-[10px] leading-tight sm:max-w-none sm:px-3 sm:text-xs"
                  title={s.label}
                >
                  <span className="line-clamp-2">{s.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-dash-border divide-y">
            {rows.map(({ project: p, checklist }) => (
              <tr key={p.id} className="hover:bg-dash-muted/40">
                {showIdentityColumns ? (
                  <>
                    <td className="border-dash-border bg-dash-card text-dash-foreground sticky left-0 z-[1] border-r px-3 py-2 font-medium whitespace-nowrap sm:px-4">
                      {p.registered_clients?.name ?? "—"}
                    </td>
                    <td className="text-dash-foreground max-w-[200px] truncate px-3 py-2 sm:max-w-xs sm:px-4">
                      <Link
                        href={`/projects/${p.id}`}
                        className="text-dash-accent font-medium underline-offset-2 hover:underline"
                      >
                        {p.title}
                      </Link>
                    </td>
                  </>
                ) : null}
                {WORKFLOW_STEPS.map((step) => {
                  const st = checklist[step.key] ?? "pending";
                  return (
                    <td key={step.key} className="px-1 py-1.5 sm:px-2">
                      {readOnly ? (
                        <span
                          title={
                            st === "not_provided"
                              ? "Provided by another party — outside our scope."
                              : undefined
                          }
                          className={`inline-flex w-full min-w-[72px] max-w-[100px] items-center justify-center rounded-lg border border-transparent px-1 py-1 text-[10px] font-medium sm:min-w-[90px] sm:max-w-none sm:px-2 sm:text-xs ${cellClass(st)}`}
                        >
                          {statusLabel(st)}
                        </span>
                      ) : (
                        <select
                          aria-label={`${p.title} — ${step.label}`}
                          disabled={pending}
                          value={st}
                          onChange={(e) =>
                            onStepChange(p, step.key, e.target.value as WorkflowStepStatus)
                          }
                          className={`w-full min-w-[72px] max-w-[100px] rounded-lg border border-transparent px-1 py-1 text-[10px] font-medium sm:min-w-[90px] sm:max-w-none sm:px-2 sm:text-xs ${cellClass(st)}`}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option
                              key={o.value}
                              value={o.value}
                              title={
                                o.value === "not_provided"
                                  ? "We do not provide this step — e.g. client or third party does. Not treated as our pending work."
                                  : undefined
                              }
                            >
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
