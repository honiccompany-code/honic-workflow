/**
 * Canonical public origin for this deployment (no path, no trailing slash).
 * Set NEXT_PUBLIC_APP_URL (e.g. https://inova.honiccompany.com). Do not hardcode domains in app code.
 */
export function getPublicAppUrlFromEnv(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
}

type HeaderBag = { get(name: string): string | null };

/**
 * Prefer NEXT_PUBLIC_APP_URL; otherwise infer from request headers (reverse proxy / CDN).
 * Use env in production so share links stay correct even if Host headers vary.
 */
export function resolvePublicSiteBaseUrl(headers: HeaderBag): string {
  const fromEnv = getPublicAppUrlFromEnv();
  if (fromEnv) return fromEnv;

  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) return "";

  const forwardedProto = headers.get("x-forwarded-proto");
  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.includes(".localhost");
  const proto = forwardedProto ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Google OAuth redirect URI — must exactly match Google Cloud Console.
 * Order: GOOGLE_OAUTH_REDIRECT_URI, else NEXT_PUBLIC_APP_URL + /api/google/oauth/callback.
 * No implicit localhost; set env for every deployment (production or local preview).
 */
export function getGoogleOAuthRedirectUri(): string {
  const explicit = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const base = getPublicAppUrlFromEnv();
  if (base) return `${base}/api/google/oauth/callback`;

  return "";
}
