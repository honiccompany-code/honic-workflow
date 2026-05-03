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

export function InvoiceStatCards({
  distinctNames,
  totalInvoices,
}: {
  distinctNames: number;
  totalInvoices: number | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Registered names"
        value={distinctNames}
        hint="Rows in registered_clients (synced from invoices)"
      />
      <StatCard
        label="Invoice rows"
        value={totalInvoices ?? "—"}
        hint={totalInvoices === null ? "Could not load total count" : "All invoice records"}
      />
      <StatCard label="Registry" value="Auto" hint="New invoice names upsert via DB trigger" />
      <StatCard label="Dashboard" value="Live" hint="RPC or registered_clients table" />
    </div>
  );
}
