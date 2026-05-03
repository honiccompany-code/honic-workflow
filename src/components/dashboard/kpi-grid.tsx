import type { ReactNode } from "react";

function KpiCard({
  label,
  value,
  hint,
  icon,
  accentClass,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  accentClass: string;
}) {
  return (
    <div className="border-dash-border bg-dash-card group rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-dash-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</p>
          <p className="text-dash-foreground mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
          {hint ? (
            <p className="text-dash-muted-foreground mt-1 text-xs leading-snug">{hint}</p>
          ) : null}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${accentClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function IconUsers() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    </svg>
  );
}

function IconFolders() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 9.776c0-1.204.992-2.18 2.218-2.18h3.374c.517 0 1.01.201 1.377.558L11.53 6.97a2.25 2.25 0 0 1 1.591-.659h5.461c1.226 0 2.218.976 2.218 2.18v7.394c0 1.204-.992 2.18-2.218 2.18H5.968a2.218 2.218 0 0 1-2.218-2.18V9.776Z"
      />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
  );
}

function IconCheckbox() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

export function KpiGrid({
  registeredCount,
  totalProjects,
  activeProjects,
  openTasks,
  registryNewThisMonth,
}: {
  registeredCount: number;
  totalProjects: number | null;
  activeProjects: number | null;
  openTasks: number | null;
  registryNewThisMonth: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Registered clients"
        value={registeredCount}
        hint="From registered_clients (invoice names)"
        accentClass="bg-cyan-500/10 text-cyan-600 ring-cyan-500/20 dark:text-cyan-400"
        icon={<IconUsers />}
      />
      <KpiCard
        label="Tracked projects"
        value={totalProjects ?? "—"}
        hint={totalProjects === null ? "Run 006_project_tracking.sql if missing" : "All rows in tracked_projects"}
        accentClass="bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400"
        icon={<IconFolders />}
      />
      <KpiCard
        label="Active projects"
        value={activeProjects ?? "—"}
        hint="Excludes completed & on hold"
        accentClass="bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-400"
        icon={<IconPlay />}
      />
      <KpiCard
        label="Open tasks"
        value={openTasks ?? "—"}
        hint={`${registryNewThisMonth} new registrants this month (UTC)`}
        accentClass="bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400"
        icon={<IconCheckbox />}
      />
    </div>
  );
}
