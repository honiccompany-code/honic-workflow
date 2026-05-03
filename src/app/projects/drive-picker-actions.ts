"use server";

import {
  assertDescendantOfFolder,
  getDriveApi,
  listDriveFolder,
} from "@/lib/google-drive-server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";

export async function listDriveFoldersForPicker(parentFolderId: string | null): Promise<
  | {
      ok: true;
      folders: { id: string; name: string }[];
      linkedRootId: string;
      listedFolderId: string;
    }
  | { ok: false; error: string }
> {
  const result = await listDriveFolder(parentFolderId ? { parentFolderId } : undefined);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const folders = result.files
    .filter((f) => f.mimeType === "application/vnd.google-apps.folder")
    .map((f) => ({ id: f.id, name: f.name }));

  return {
    ok: true,
    folders,
    linkedRootId: result.folderId,
    listedFolderId: result.listedFolderId,
  };
}

/** List folders + non-folder files under the project Drive folder (or a subfolder) for “attach to activity”. */
export async function listProjectDriveChildren(
  projectId: string,
  parentFolderId: string | null,
): Promise<
  | {
      ok: true;
      folders: { id: string; name: string }[];
      files: { id: string; name: string }[];
      listedFolderId: string;
      projectFolderId: string;
    }
  | { ok: false; error: string }
> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, error: "Database not configured." };
  }

  const { data: row, error: fetchErr } = await supabase
    .from("tracked_projects")
    .select("google_drive_folder_id")
    .eq("id", projectId)
    .maybeSingle();

  if (fetchErr || !row?.google_drive_folder_id) {
    return { ok: false, error: "This project has no Drive folder yet." };
  }

  const projectFolderId = row.google_drive_folder_id;
  const listUnder = parentFolderId ?? projectFolderId;

  if (parentFolderId) {
    const api = await getDriveApi(["https://www.googleapis.com/auth/drive.readonly"]);
    if (!api.ok) return { ok: false, error: api.error };
    const ok = await assertDescendantOfFolder(api.drive, projectFolderId, parentFolderId);
    if (!ok) {
      return { ok: false, error: "That folder is not inside this project’s Drive folder." };
    }
  }

  const result = await listDriveFolder({ parentFolderId: listUnder });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const folders = result.files
    .filter((f) => f.mimeType === "application/vnd.google-apps.folder")
    .map((f) => ({ id: f.id, name: f.name }));

  const files = result.files
    .filter((f) => f.mimeType !== "application/vnd.google-apps.folder")
    .map((f) => ({ id: f.id, name: f.name }));

  return {
    ok: true,
    folders,
    files,
    listedFolderId: result.listedFolderId,
    projectFolderId,
  };
}
