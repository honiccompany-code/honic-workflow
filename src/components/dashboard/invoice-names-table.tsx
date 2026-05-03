"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { RegisteredClientRow } from "@/lib/dashboard-types";

export type { RegisteredClientRow };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatTs(iso: string | null | undefined) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RegisteredClientsTable({ rows }: { rows: RegisteredClientRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.name} ${r.lastSeenAt ?? ""} ${r.firstSeenAt ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <label htmlFor="invoice-client-search" className="sr-only">
            Search registered clients
          </label>
          <input
            id="invoice-client-search"
            type="search"
            placeholder="Search by name or date…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-dash-border bg-dash-card text-dash-foreground placeholder:text-dash-muted-foreground focus:ring-dash-accent/25 w-full rounded-xl border py-2.5 pr-3 pl-10 text-sm shadow-sm outline-none focus:ring-2"
          />
          <svg
            className="text-dash-muted-foreground pointer-events-none absolute top-3 left-3 h-4 w-4"
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
        <p className="text-dash-muted-foreground text-xs">
          Showing{" "}
          <span className="text-dash-foreground font-semibold">{filtered.length}</span> of {rows.length}
        </p>
      </div>

      <div className="border-dash-border bg-dash-card overflow-hidden rounded-2xl border shadow-sm">
        <div className="overflow-x-auto">
          <table className="divide-dash-border min-w-full divide-y text-sm">
            <thead className="bg-dash-muted/80">
              <tr className="text-dash-muted-foreground text-left text-xs font-semibold tracking-wide uppercase">
                <th className="px-5 py-3.5">Registered name</th>
                <th className="px-5 py-3.5 whitespace-nowrap">First seen</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Last activity</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-right">Tracking</th>
              </tr>
            </thead>
            <tbody className="divide-dash-border divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-dash-muted-foreground px-5 py-14 text-center text-sm">
                    No clients match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-dash-muted/50 transition-colors">
                    <td className="text-dash-foreground px-5 py-3.5 font-medium">{row.name}</td>
                    <td className="text-dash-muted-foreground px-5 py-3.5 whitespace-nowrap tabular-nums">
                      {formatTs(row.firstSeenAt)}
                    </td>
                    <td className="text-dash-muted-foreground px-5 py-3.5 whitespace-nowrap tabular-nums">
                      {formatTs(row.lastSeenAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {UUID_RE.test(row.id) ? (
                        <Link
                          href={`/projects?client=${encodeURIComponent(row.id)}`}
                          className="text-dash-accent text-xs font-semibold underline-offset-2 hover:underline"
                        >
                          Projects
                        </Link>
                      ) : (
                        <span className="text-dash-muted-foreground text-xs" title="Needs UUID from registered_clients">
                          —
                        </span>
                      )}
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

/** @deprecated Use RegisteredClientsTable */
export const InvoiceNamesTable = RegisteredClientsTable;
