"use client";

import { useMemo, useState } from "react";

type MilestoneDraft = { title: string; target_date: string };

function emptyRow(): MilestoneDraft {
  return { title: "", target_date: "" };
}

/** Client-only: dates, milestone rows, hidden JSON. Static intro lives in `project-timeline-card.tsx` (server). */
export function ProjectTimelineFields() {
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([emptyRow()]);

  const timelineJson = useMemo(() => {
    const cleaned = milestones
      .map((m) => ({
        title: m.title.trim(),
        target_date: m.target_date.trim() || null,
      }))
      .filter((m) => m.title.length > 0);
    return JSON.stringify(cleaned);
  }, [milestones]);

  function addRow() {
    setMilestones((rows) => [...rows, emptyRow()]);
  }

  function removeRow(index: number) {
    setMilestones((rows) => (rows.length <= 1 ? [emptyRow()] : rows.filter((_, i) => i !== index)));
  }

  function patchRow(index: number, patch: Partial<MilestoneDraft>) {
    setMilestones((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="start_date" className="text-dash-muted-foreground mb-1 block text-xs font-medium">
            Start date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            className="border-dash-border bg-dash-muted/30 text-dash-foreground focus:ring-dash-accent/25 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="target_end_date" className="text-dash-muted-foreground mb-1 block text-xs font-medium">
            Target end
          </label>
          <input
            id="target_end_date"
            name="target_end_date"
            type="date"
            className="border-dash-border bg-dash-muted/30 text-dash-foreground focus:ring-dash-accent/25 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
          />
        </div>
      </div>

      <p className="text-dash-muted-foreground mb-2 text-xs font-medium">Milestones</p>
      <div className="space-y-3">
        {milestones.map((row, index) => (
          <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="text-dash-muted-foreground sr-only" htmlFor={`milestone-title-${index}`}>
                Milestone title
              </label>
              <input
                id={`milestone-title-${index}`}
                type="text"
                value={row.title}
                onChange={(e) => patchRow(index, { title: e.target.value })}
                placeholder="e.g. Schematic review"
                autoComplete="off"
                className="border-dash-border bg-dash-muted/30 text-dash-foreground focus:ring-dash-accent/25 w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
              />
            </div>
            <div className="flex shrink-0 gap-2 sm:w-44">
              <div className="min-w-0 flex-1">
                <label className="text-dash-muted-foreground sr-only" htmlFor={`milestone-date-${index}`}>
                  Target date
                </label>
                <input
                  id={`milestone-date-${index}`}
                  type="date"
                  value={row.target_date}
                  onChange={(e) => patchRow(index, { target_date: e.target.value })}
                  className="border-dash-border bg-dash-muted/30 text-dash-foreground focus:ring-dash-accent/25 w-full rounded-xl border px-2 py-2.5 text-sm outline-none focus:ring-2"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-dash-muted-foreground hover:text-dash-foreground hover:bg-dash-border/40 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors"
                aria-label="Remove milestone row"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-dash-muted-foreground mt-2 text-xs leading-relaxed">
        e.g. Layout release to fab — <span className="tabular-nums">2026-06-15</span>
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="text-dash-accent hover:text-dash-foreground text-sm font-semibold underline-offset-2 hover:underline"
        >
          Add milestone
        </button>
      </div>

      <input type="hidden" name="timeline_milestones" value={timelineJson} readOnly />
    </>
  );
}
