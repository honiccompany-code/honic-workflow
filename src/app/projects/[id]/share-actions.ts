"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createProjectShareLink } from "@/lib/project-share";
import { resolveShareLinkOriginForProjectFromHeaders } from "@/lib/share-link-origin";
import { resolvePublicSiteBaseUrl } from "@/lib/site-url";

export type CreateShareLinkState = { ok: true; url: string } | { ok: false; message: string } | null;

async function inferBaseUrlFromRequest(): Promise<string> {
  const h = await headers();
  return resolvePublicSiteBaseUrl(h);
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

  const h = await headers();
  const origin = await resolveShareLinkOriginForProjectFromHeaders(projectId, h);
  const path = `/share/${created.token}`;
  const url = origin ? `${origin.replace(/\/$/, "")}${path}` : path;

  revalidatePath(`/projects/${projectId}/work`);
  return { ok: true, url };
}
