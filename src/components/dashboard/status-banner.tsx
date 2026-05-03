import type { DashboardBanner } from "@/lib/dashboard-types";

export function StatusBanner({ banner }: { banner: DashboardBanner | null }) {
  if (!banner) return null;

  const styles =
    banner.tone === "success"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-950 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-50"
      : banner.tone === "error"
        ? "border-red-500/25 bg-red-500/10 text-red-950 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-50"
        : "border-amber-500/25 bg-amber-500/10 text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-50";

  return (
    <div
      role="status"
      className={`rounded-2xl border px-4 py-3 text-sm leading-snug ${styles}`}
    >
      {banner.text}
    </div>
  );
}
