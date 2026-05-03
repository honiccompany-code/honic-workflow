import type { HomeWorkflowSummaries } from "@/lib/home-workflow-data";

function Card({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent: string;
}) {
  return (
    <div
      className={`border-dash-border bg-dash-card rounded-2xl border p-4 shadow-sm sm:p-5 ${accent}`}
    >
      <p className="text-dash-muted-foreground text-[11px] font-semibold tracking-wide uppercase">{label}</p>
      <p className="text-dash-foreground mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
      {hint ? <p className="text-dash-muted-foreground mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}

export function HomeSummaryCards({ s }: { s: HomeWorkflowSummaries }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-7">
      <Card label="Total clients" value={s.totalClients} hint="Registered names" accent="" />
      <Card label="Total projects" value={s.totalProjects} hint="All tracked" accent="" />
      <Card
        label="Completed"
        value={s.completedProjects}
        hint="Project status"
        accent="ring-1 ring-emerald-500/25"
      />
      <Card
        label="Incomplete"
        value={s.incompleteProjects}
        hint="Not completed"
        accent="ring-1 ring-amber-500/20"
      />
      <Card
        label="Critical"
        value={s.criticalProjects}
        hint="Priority flag"
        accent="ring-1 ring-red-500/25"
      />
      <Card label="On hold" value={s.onHoldProjects} hint="Paused" accent="ring-1 ring-slate-500/20" />
      <Card
        label="Active pipeline"
        value={s.activeProjects}
        hint="Planning → testing"
        accent="ring-1 ring-cyan-500/20"
      />
    </div>
  );
}
