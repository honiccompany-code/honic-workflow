# Guide: Google Drive as a signed-in user (OAuth 2.0)

This app **currently uses a service account JWT** (`google-drive-server.ts`). Service accounts have **no personal Drive storage**, which causes quota errors unless you use Shared drives or shared folders.

**OAuth as a user** means: a real Google account authorizes your app once; your server stores a **refresh token** and calls Drive **as that user**. Uploads use **that user’s quota** automatically—no sharing every folder with a robot account.

---

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select (or create) a project.
2. **APIs & Services → Library** → enable **Google Drive API** (same project you might already use).
3. **APIs & Services → OAuth consent screen**
   - User type: **External** (or **Internal** if Workspace-only).
   - App name, support email, developer contact.
   - **Scopes → Add or remove scopes** → add:
     - `https://www.googleapis.com/auth/drive.readonly` (list/read)
     - `https://www.googleapis.com/auth/drive` (upload/create/delete)  
     Or narrower scopes if you redesign the app later (e.g. `drive.file`).
   - Add **test users** while in Testing mode (every Gmail you’ll sign in with).

4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**.
   - **Authorized JavaScript origins** (dev):  
     `http://localhost:3000`
   - **Authorized redirect URIs** (example for Next.js):  
     `http://localhost:3000/api/google/oauth/callback`  
     (Adjust host/port/path to match where you implement the callback.)

5. Save **Client ID** and **Client secret** → put them in **server-only** env (never expose the secret to the browser).

---

## 2. Environment variables (server)

Typical names:

| Variable | Purpose |
|----------|---------|
| `GOOGLE_OAUTH_CLIENT_ID` | Web client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Web client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | Must exactly match a redirect URI in Cloud Console |
| `GOOGLE_DRIVE_FOLDER_ID` | Root folder the user owns or can write to (same idea as today) |

After the first successful OAuth, you’ll obtain a **refresh token** (long-lived). Store it securely:

- **Single operator / internal tool:** encrypt and store in env `GOOGLE_OAUTH_REFRESH_TOKEN` after one manual exchange, or in a small encrypted store.
- **Multiple users:** store per-user refresh tokens in your database (encrypted at rest).

---

## 3. OAuth flow (what you implement in Next.js)

High level:

1. **Start:** User clicks “Connect Google” → redirect to Google’s authorize URL with `client_id`, `redirect_uri`, `response_type=code`, `scope`, `access_type=offline`, `prompt=consent` (first time `prompt=consent` helps ensure a refresh token is issued).

2. **Callback:** Google redirects to `/api/google/oauth/callback?code=...&scope=...`. Your **Route Handler** exchanges `code` for tokens using `client_id`, `client_secret`, `redirect_uri`, `grant_type=authorization_code`.

3. **Persist:** Save `refresh_token` (and optionally `access_token` short-lived). Only the refresh token is needed long-term.

4. **API calls:** Use `googleapis` with `OAuth2`:

   ```ts
   import { google } from "googleapis";

   const oauth2Client = new google.auth.OAuth2(
     process.env.GOOGLE_OAUTH_CLIENT_ID,
     process.env.GOOGLE_OAUTH_CLIENT_SECRET,
     process.env.GOOGLE_OAUTH_REDIRECT_URI,
   );
   oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });

   const drive = google.drive({ version: "v3", auth: oauth2Client });
   ```

   Before each batch of requests you can rely on the client’s automatic refresh, or call `oauth2Client.getAccessToken()`.

5. **Scopes:** Match what you showed on the consent screen. Full `drive` scope is powerful—prefer least privilege when possible.

---

## 4. Security checklist

- **Client secret** and **refresh token** only on the server (Route Handlers, Server Actions, env).
- Use **HTTPS** in production; redirect URIs must match Cloud Console exactly.
- Rotate credentials if leaked.
- For production, move OAuth app from **Testing** to **In production** after verification if using External users.

---

## 5. Relation to this repository

- Today, **`src/lib/google-drive-server.ts`** builds Drive clients with **JWT (service account)** only.
- Adding OAuth means introducing an **alternate auth path**: e.g. `getDriveAuth()` returns either JWT or `OAuth2` based on env (`DRIVE_AUTH_MODE=oauth|service_account`).
- All `drive.files.*` calls must use the **same auth object** you choose for that deployment.

There is **no env-only switch** that turns OAuth on without code changes—implementation must wire OAuth credentials into `google.drive({ auth })` instead of `GoogleAuth` with PEM.

---

## 6. References

- [Drive API overview](https://developers.google.com/drive/api/guides/about-sdk)
- [Using OAuth 2.0 for Web Server Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [OAuth 2.0 scopes for Google APIs](https://developers.google.com/identity/protocols/oauth2/scopes#drive)
