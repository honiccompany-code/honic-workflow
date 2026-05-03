# Cloudflare: DNS (wildcard + `inova`) and optional Cloudflare Tunnel (`cloudflared`)

Your app on **Vercel** usually needs **only Cloudflare DNS** (no `cloudflared`). Use **Cloudflare Tunnel** only if you want traffic to hit a **machine you control** (home PC, VPS) instead of Vercel.

---

## Part A — Cloudflare Dashboard (DNS) — typical with Vercel

### 1. Open the right zone

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Select the site **`honiccompany.com`** (the root domain, not only a subdomain).

### 2. Add / check records (DNS → Records)

You need whatever **Vercel** shows under **Project → Settings → Domains** for each hostname.

#### A. Main app: `inova.honiccompany.com`

- **Type:** usually **CNAME**
- **Name:** `inova`
- **Target:** the value Vercel gives (often `cname.vercel-dns.com` or a project-specific `*.vercel-dns-...` hostname — **copy from Vercel**, do not guess).
- **Proxy status:**  
  - **Proxied (orange cloud)** — traffic goes through Cloudflare (CDN/WAF).  
  - **DNS only (grey)** — direct to Vercel; sometimes used for debugging.

#### B. Wildcard for client share hosts: `*.honiccompany.com`

1. In Vercel, add domain **`*.honiccompany.com`** to the **same** project and note the DNS instructions.
2. In Cloudflare **DNS → Add record**:
   - **Type:** **CNAME** (unless Vercel says otherwise)
   - **Name:** `*` (this means `*.honiccompany.com`)
   - **Target:** same style of target Vercel shows for the wildcard (often same family as `inova`).
3. Save.

**Important:** A **specific** record (e.g. `inova`) overrides the wildcard **only for that exact name**. Other names like `hosea-api.honiccompany.com` use the wildcard.

### 3. SSL/TLS (when proxied)

1. **SSL/TLS** → **Overview**.
2. For traffic proxied to Vercel, **Full** or **Full (strict)** is common once HTTPS works end-to-end. If you see redirect loops, try **Full** first or temporarily set `inova` to **DNS only** to isolate the issue.

### 4. Propagation

Changes are usually fast (minutes). Clear local DNS cache if something looks stuck: `ipconfig /flushdns` on Windows.

---

## Part B — Cloudflare Tunnel (`cloudflared`) — optional

Use this when the **origin** is **your own server or PC** (e.g. `http://localhost:3000` or `http://127.0.0.1:3000`), **not** when Vercel already hosts the app.

### 1. Install `cloudflared` (Windows)

- [Official install instructions](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/#windows)  
- Or: `winget install --id Cloudflare.cloudflared`

Check:

```powershell
cloudflared --version
```

### 2. Log in to Cloudflare (browser)

```powershell
cloudflared tunnel login
```

Choose the account that owns **honiccompany.com**. A certificate file is saved under your user profile (e.g. `%USERPROFILE%\.cloudflared\`).

### 3. Create a tunnel

Pick a tunnel **name** (internal label, not the public URL):

```powershell
cloudflared tunnel create honic-app
```

Note the **Tunnel ID** and the path to the **credentials JSON** file.

### 4. Route DNS to the tunnel (creates CNAME in Cloudflare)

Example: send **`inova.honiccompany.com`** through this tunnel:

```powershell
cloudflared tunnel route dns honic-app inova.honiccompany.com
```

Wildcard example:

```powershell
cloudflared tunnel route dns honic-app "*.honiccompany.com"
```

(If the CLI rejects quotes, check current docs for wildcard syntax; some versions use a different command.)

Alternatively, create the **CNAME** manually in the dashboard to `<tunnel-id>.cfargotunnel.com` as Cloudflare documents.

### 5. Config file (`config.yml`)

Path is often `%USERPROFILE%\.cloudflared\config.yml`. Example:

```yaml
tunnel: <YOUR_TUNNEL_UUID>
credentials-file: C:\Users\<YOU>\.cloudflared\<UUID>.json

ingress:
  - hostname: inova.honiccompany.com
    service: http://localhost:3000
  - hostname: "*.honiccompany.com"
    service: http://localhost:3000
  - service: http_status:404
```

- **`service`:** where your app listens (port **3000** is typical for `npm run dev` / local Node).
- Order matters: first matching rule wins; last line catches everything else with 404.

**Note:** Wildcard `hostname` in YAML may need quoting. If unsupported, add **one hostname per line** or use **Cloudflare dashboard** DNS to `cfargotunnel.com` for each name.

### 6. Run the tunnel

```powershell
cloudflared tunnel run honic-app
```

Leave it running. Your Next app must be running on the configured `service` URL.

### 7. Run as a Windows service (optional)

See: [Run as a service on Windows](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/configure-tunnels/local-management/as-a-service/windows/).

---

## Part C — App env (same for Vercel or tunnel)

Set in **Vercel env** or on the machine running Next:

```env
NEXT_PUBLIC_APP_URL=https://inova.honiccompany.com
NEXT_PUBLIC_SHARE_PARENT_DOMAIN=honiccompany.com
```

OAuth / Google Console must list the same origins you actually use.

---

## Quick decision

| Goal | Use |
|------|-----|
| App hosted on **Vercel** | **Part A** only — DNS + Vercel domains (`inova`, `*.honiccompany.com`). **No** `cloudflared` on your PC for production. |
| App runs **only on your PC / private server** and you want `inova.honiccompany.com` on the internet | **Part B** — `cloudflared` tunnel + **Part A** DNS (often auto-created by `tunnel route dns`). |

If you say whether the app is **only on Vercel** or **only on your machine**, the exact DNS rows can be narrowed to one recipe.
