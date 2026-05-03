# Production hosting (`inova.honiccompany.com`)

This app does **not** hardcode your domain. Set **`NEXT_PUBLIC_APP_URL`** and **`GOOGLE_OAUTH_REDIRECT_URI`** (or rely on the derived callback from `NEXT_PUBLIC_APP_URL`) in the environment where the server runs.

---

## 1. DNS and HTTPS

Point **`inova.honiccompany.com`** at your host the usual way:

- **Vercel / Netlify / similar:** add the hostname in the dashboard; they issue TLS and give you a **CNAME** or **ALIAS** target.
- **VPS + Nginx / Caddy:** **A** / **AAAA** records to the server; terminate TLS there and reverse-proxy to Node (e.g. `http://127.0.0.1:3000`).

There is no requirement to use Cloudflare Tunnel; that was only one possible dev/staging pattern.

---

## 2. Required environment variables (production)

In the hosting provider’s env UI (or your process manager), set at least:

```env
NEXT_PUBLIC_APP_URL=https://inova.honiccompany.com
```

OAuth callback (pick one approach):

```env
# Option A — explicit (must match Google Console exactly)
GOOGLE_OAUTH_REDIRECT_URI=https://inova.honiccompany.com/api/google/oauth/callback

# Option B — omit GOOGLE_OAUTH_REDIRECT_URI; the app uses NEXT_PUBLIC_APP_URL + /api/google/oauth/callback
```

Also set Supabase and any Google Drive / OAuth vars as in **`.env.example`**.

Restart the app after any env change.

### Per-client share hosts (`{name}-api.honiccompany.com`)

1. Run **`supabase/012_registered_clients_share_subdomain.sql`** in the Supabase SQL editor (optional column + uniqueness).
2. In Cloudflare (zone **`honiccompany.com`**) add a **wildcard** record **`*.honiccompany.com`** to the same target as your Vercel app (and add **`*.honiccompany.com`** under **Vercel → Domains** for this project).
3. Set:

```env
NEXT_PUBLIC_SHARE_PARENT_DOMAIN=honiccompany.com
```

Client share links become **`https://{slug}-api.honiccompany.com/share/{token}`**, where `{slug}` comes from the registered client **name** (slugified) unless **`registered_clients.share_subdomain`** is set for a manual override. The path is still **`/share/{token}`** (same Next.js route on every host).

---

## 3. Google Cloud Console

For **Web application** OAuth client:

- **Authorized JavaScript origins:** `https://inova.honiccompany.com`
- **Authorized redirect URIs:** `https://inova.honiccompany.com/api/google/oauth/callback`

Must match **`getGoogleOAuthRedirectUri()`** on the server (see `src/lib/site-url.ts`).

---

## 4. Local preview while editing

`.env.local` can match **production** (same URLs as live). Share links and OAuth then target **`https://inova.honiccompany.com`**, which is appropriate if you only smoke-test OAuth on the real host.

If you need **localhost-only** OAuth for a short test, use a separate file **`env.development.local`** (Next.js loads it only in development) with overrides, for example:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/google/oauth/callback
```

Do not commit `.env.local` or `.env.development.local`.

---

## 5. Checklist

| Check | |
|--------|--|
| `NEXT_PUBLIC_APP_URL` | HTTPS, no trailing slash |
| Google redirect URI | Identical to server `GOOGLE_OAUTH_REDIRECT_URI` or `${NEXT_PUBLIC_APP_URL}/api/google/oauth/callback` |
| `metadataBase` | Set automatically from `NEXT_PUBLIC_APP_URL` in `src/app/layout.tsx` |
