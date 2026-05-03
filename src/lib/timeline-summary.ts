export type MilestoneForSummary = {
  title: string;
  target_date: string | null;
  completed_at: string | null;
  sort_order: number;
};

function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * One-line summary for dashboard tables: project window + milestone count + next checkpoint.
 */
export function formatHomeTimelineSummary(
  start_date: string | null,
  target_end_date: string | null,
  milestones: MilestoneForSummary[]
): string {
  const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order);
  const incomplete = sorted.filter((m) => !m.completed_at);
  const next = incomplete[0];

  const bits: string[] = [];

  const s = formatShortDate(start_date);
  const e = formatShortDate(target_end_date);
  if (s && e) bits.push(`${s} – ${e}`);
  else if (s) bits.push(`Start ${s}`);
  else if (e) bits.push(`Target ${e}`);

  if (sorted.length > 0) {
    bits.push(`${sorted.length} milestone${sorted.length === 1 ? "" : "s"}`);
  }

  if (next) {
    const title = next.title.length > 32 ? `${next.title.slice(0, 30)}…` : next.title;
    const when = next.target_date ? formatShortDate(next.target_date) : null;
    bits.push(`Next: ${title}${when ? ` (${when})` : ""}`);
  }

  if (bits.length === 0) return "—";
  return bits.join(" · ");
}
