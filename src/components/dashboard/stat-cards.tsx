import type { DashboardClient } from "./clients-table";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-slate-50">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function StatCards({ clients }: { clients: DashboardClient[] }) {
  const activeClients = clients.filter((c) => c.status === "active").length;
  const onHold = clients.filter((c) => c.status === "on_hold").length;
  const critical = clients.filter((c) => c.priority === "critical").length;
  const activeProjects = clients.reduce((acc, c) => acc + c.active_projects, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Clients" value={clients.length} hint="All accounts on record" />
      <StatCard label="Active clients" value={activeClients} hint="Status: active" />
      <StatCard label="Active projects" value={activeProjects} hint="Across all clients" />
      <StatCard label="Critical priority" value={critical} hint={`${onHold} client(s) on hold`} />
    </div>
  );
}
