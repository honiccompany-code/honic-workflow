"use client";

import { useMemo, useState } from "react";

export type DashboardClient = {
  id: string;
  name: string;
  organization: string | null;
  status: string;
  active_projects: number;
  total_projects: number;
  priority: string;
  updated_at: string;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:
      "bg-emerald-50 text-emerald-800 ring-emerald-600/15 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/20",
    new: "bg-sky-50 text-sky-800 ring-sky-600/15 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-500/20",
    on_hold:
      "bg-amber-50 text-amber-900 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-500/25",
    completed:
      "bg-zinc-100 text-zinc-700 ring-zinc-500/15 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-500/20",
  };
  const label = status.replace(/_/g, " ");
  const cls =
    styles[status] ??
    "bg-zinc-100 text-zinc-700 ring-zinc-500/15 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${cls}`}
    >
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    low: "text-zinc-600 dark:text-zinc-400",
    medium: "text-blue-700 dark:text-blue-400",
    high: "text-orange-700 dark:text-orange-400",
    critical: "text-red-700 dark:text-red-400",
  };
  return (
    <span
      className={`text-xs font-semibold uppercase tracking-wide ${styles[priority] ?? styles.medium}`}
    >
      {priority}
    </span>
  );
}

export function ClientsTable({ rows }: { rows: DashboardClient[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.name} ${r.organization ?? ""} ${r.status} ${r.priority}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <label htmlFor="client-search" className="sr-only">
            Search clients
          </label>
          <input
            id="client-search"
            type="search"
            placeholder="Search clients, organization, status…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-10 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-400/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-slate-500/30"
          />
          <svg
            className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span>{" "}
          of {rows.length}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50/90 dark:bg-slate-800/80">
              <tr className="text-left text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
                <th className="px-4 py-3.5 whitespace-nowrap">Client</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Organization</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-right">Active</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-right">Total</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Priority</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    No clients match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{client.name}</span>
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3.5 text-slate-600 dark:text-slate-400">
                      {client.organization ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-800 dark:text-slate-200">
                      {client.active_projects}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-800 dark:text-slate-200">
                      {client.total_projects}
                    </td>
                    <td className="px-4 py-3.5">
                      <PriorityBadge priority={client.priority} />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 tabular-nums dark:text-slate-400">
                      {new Date(client.updated_at).toLocaleDateString("en-GB", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
