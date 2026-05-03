import { NextResponse } from "next/server";
import { google } from "googleapis";

import { getGoogleOAuthRedirectUri } from "@/lib/site-url";

export const runtime = "nodejs";

const DRIVE_FULL_SCOPE = "https://www.googleapis.com/auth/drive" as const;

export async function GET() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri = getGoogleOAuthRedirectUri();

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET in .env.local. Add them from your Google Cloud OAuth client (Web application).",
      },
      { status: 500 },
    );
  }

  if (!redirectUri) {
    return NextResponse.json(
      {
        error:
          "Set NEXT_PUBLIC_APP_URL (e.g. https://inova.honiccompany.com) or GOOGLE_OAUTH_REDIRECT_URI so the OAuth callback URL is known. See docs/production-hosting.md.",
      },
      { status: 500 },
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [DRIVE_FULL_SCOPE],
  });

  return NextResponse.redirect(url);
}
