import { NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const err = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (err) {
    return new NextResponse(`Google returned an error: ${err}`, { status: 400 });
  }
  if (!code) {
    return new NextResponse("Missing authorization code.", { status: 400 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || "http://localhost:3000/api/google/oauth/callback";

  if (!clientId || !clientSecret) {
    return new NextResponse("Server missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET.", {
      status: 500,
    });
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2.getToken(code);
    const refresh = tokens.refresh_token;
    if (!refresh) {
      return new NextResponse(
        `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Drive OAuth</title></head><body style="font-family:system-ui;padding:2rem;max-width:40rem">
        <h1>No refresh token</h1>
        <p>Google did not return a refresh token. Open your Google Account → Security → Third-party access, remove access for this app, then visit <a href="/api/google/oauth/start">/api/google/oauth/start</a> again (use the same Google account).</p>
        </body></html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Drive OAuth — copy refresh token</title></head>
<body style="font-family:system-ui,sans-serif;padding:2rem;max-width:48rem;line-height:1.5">
  <h1 style="font-size:1.25rem">Google Drive connected</h1>
  <p>Add this line to <strong>.env.local</strong>, then restart <code>npm run dev</code>:</p>
  <pre style="background:#0f172a;color:#e2e8f0;padding:1rem;border-radius:0.5rem;overflow:auto;white-space:pre-wrap;word-break:break-all">GOOGLE_OAUTH_REFRESH_TOKEN=${escapeHtml(refresh)}</pre>
  <p style="color:#64748b;font-size:0.875rem">Do not commit <code>.env.local</code> to git. After saving, uploads and Drive listing use your Google account quota.</p>
  <p><a href="/drive">Open Drive</a> · <a href="/">Home</a></p>
</body></html>`;

    return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(`Token exchange failed: ${msg}`, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
