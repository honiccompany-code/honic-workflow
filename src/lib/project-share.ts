import { randomBytes } from "node:crypto";

import { assertDescendantOfFolder, getDriveApi } from "@/lib/google-drive-server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

const TOKEN_BYTES = 24;

export function generateShareToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export async function createProjectShareLink(params: {
  trackedProjectId: string;
  label?: string | null;
  expiresAt?: Date | null;
}): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, error: "Database not configured." };
  }

  const token = generateShareToken();
  const { error } = await supabase.from("project_share_links").insert({
    tracked_project_id: params.trackedProjectId,
    token,
    label: params.label?.trim() || null,
    expires_at: params.expiresAt?.toISOString() ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, token };
}

export async function resolveShareTokenToProjectId(
  token: string,
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const raw = token.trim();
  if (!raw || raw.length < 32) {
    return { ok: false, error: "Invalid link." };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, error: "Database not configured." };
  }

  const { data, error } = await supabase
    .from("project_share_links")
    .select("tracked_project_id, expires_at")
    .eq("token", raw)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "This link is not valid or has been removed." };
  }

  if (data.expires_at) {
    const exp = new Date(data.expires_at as string);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
      return { ok: false, error: "This link has expired." };
    }
  }

  return { ok: true, projectId: data.tracked_project_id as string };
}

/**
 * Confirms a Drive file sits under the project’s linked folder (for token-scoped file access).
 */
export async function assertShareFileInProjectFolder(
  projectDriveFolderId: string,
  fileId: string,
): Promise<boolean> {
  const api = await getDriveApi(["https://www.googleapis.com/auth/drive.readonly"]);
  if (!api.ok) return false;
  return assertDescendantOfFolder(api.drive, projectDriveFolderId, fileId);
}

export type ProjectShareLinkRow = {
  id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  label: string | null;
};

export async function listShareLinksForProject(projectId: string): Promise<ProjectShareLinkRow[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("project_share_links")
    .select("id, token, created_at, expires_at, label")
    .eq("tracked_project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return [];
  return (data ?? []) as ProjectShareLinkRow[];
}
