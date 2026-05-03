import { resolvePublicSiteBaseUrl } from "@/lib/site-url";
import { normalizeRegisteredClientJoin } from "@/lib/supabase-relations";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

const DNS_LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const MAX_LABEL = 63;
/** Room for `-api` suffix (4 chars) on auto-derived labels. */
const MAX_BASE_FOR_AUTO = MAX_LABEL - 4;

/**
 * Parent domain for per-client share hosts (no protocol, no leading dot).
 * Example: honiccompany.com → https://hosea-api.honiccompany.com/share/…
 */
export function getShareParentDomainFromEnv(): string {
  return (process.env.NEXT_PUBLIC_SHARE_PARENT_DOMAIN ?? "")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase();
}

function slugifyNameSegment(name: string): string {
  let s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!s) s = "client";
  if (s.length > MAX_BASE_FOR_AUTO) {
    s = s.slice(0, MAX_BASE_FOR_AUTO).replace(/-+$/g, "") || "client";
  }
  return s;
}

/** Full hostname label before `.${parent}`: explicit DB value or `{slug}-api` from name. */
export function shareHostLabelFromClient(client: { name: string; share_subdomain?: string | null }): string | null {
  const explicit = client.share_subdomain?.trim().toLowerCase();
  if (explicit) {
    if (explicit.length > MAX_LABEL || !DNS_LABEL.test(explicit)) return null;
    return explicit;
  }
  const base = slugifyNameSegment(client.name);
  const withApi = base.endsWith("-api") ? base : `${base}-api`;
  const trimmed = withApi.slice(0, MAX_LABEL).replace(/-+$/g, "");
  if (!trimmed || !DNS_LABEL.test(trimmed)) return null;
  return trimmed;
}

/**
 * Origin used in client share URLs. Uses wildcard subdomains when parent domain + client label are available.
 */
export function buildShareLinkOrigin(
  client: { name: string; share_subdomain?: string | null } | null,
  fallbackOrigin: string,
): string {
  const fb = fallbackOrigin.replace(/\/$/, "");
  const parent = getShareParentDomainFromEnv();
  if (!parent || !client) return fb;

  const label = shareHostLabelFromClient(client);
  if (!label) return fb;

  return `https://${label}.${parent}`;
}

export async function resolveShareLinkOriginForProject(
  projectId: string,
  fallbackOrigin: string,
): Promise<string> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return fallbackOrigin.replace(/\/$/, "");

  const { data, error } = await supabase
    .from("tracked_projects")
    .select("registered_clients ( name, share_subdomain )")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !data) return fallbackOrigin.replace(/\/$/, "");

  const rc = (data as { registered_clients: unknown }).registered_clients;
  const client = normalizeRegisteredClientJoin(rc);
  return buildShareLinkOrigin(client, fallbackOrigin);
}

/** For server actions: fallback = env or request host. */
export async function resolveShareLinkOriginForProjectFromHeaders(
  projectId: string,
  headers: { get(name: string): string | null },
): Promise<string> {
  const fallback = resolvePublicSiteBaseUrl(headers);
  return resolveShareLinkOriginForProject(projectId, fallback);
}
