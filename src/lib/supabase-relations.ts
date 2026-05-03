/**
 * Supabase foreign-table selects often return an object; some typings use an array of one.
 */
export function normalizeRegisteredClientJoin(rc: unknown): {
  name: string;
  share_subdomain?: string | null;
} | null {
  if (rc == null) return null;
  const row = Array.isArray(rc) ? rc[0] : rc;
  if (row && typeof row === "object" && "name" in row) {
    const rawSub = (row as { share_subdomain?: unknown }).share_subdomain;
    const share_subdomain =
      typeof rawSub === "string" && rawSub.trim() ? rawSub.trim().toLowerCase() : null;
    return { name: String((row as { name: unknown }).name), share_subdomain };
  }
  return null;
}
