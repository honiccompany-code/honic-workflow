"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createProjectShareLink } from "@/lib/project-share";

export type CreateShareLinkState = { ok: true; url: string } | { ok: false; message: string } | null;

function publicShareBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");

  return "";
}

async function inferBaseUrlFromRequest(): Promise<string> {
  const fromEnv = publicShareBaseUrl();
  if (fromEnv) return fromEnv;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** For building absolute share URLs in Server Components (e.g. link list). */
export async function getPublicSiteBaseUrl(): Promise<string> {
  return inferBaseUrlFromRequest();
}

export async function createClientShareLinkAction(
  projectId: string,
  _prev: CreateShareLinkState,
  _formData: FormData,
): Promise<CreateShareLinkState> {
  const created = await createProjectShareLink({ trackedProjectId: projectId });
  if (!created.ok) {
    return { ok: false, message: created.error };
  }

  const base = await inferBaseUrlFromRequest();
  const path = `/share/${created.token}`;
  const url = base ? `${base}${path}` : path;

  revalidatePath(`/projects/${projectId}/work`);
  return { ok: true, url };
}
