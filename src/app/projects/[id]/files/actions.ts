"use server";

import { revalidatePath } from "next/cache";

import {
  ensureChildFolderByName,
  moveDriveFileIntoPipelineFolder,
  uploadFileToParentFolder,
} from "@/lib/google-drive-server";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { WORKFLOW_STEPS, workflowStepUploadFolderLabel } from "@/lib/workflow-checklist";

export type ProjectDriveUploadState =
  | {
      ok: true;
      kind: "upload" | "attach";
      fileName: string;
      driveFileId: string;
      pipelineStepLabel: string;
      mimeType: string;
    }
  | { ok: false; message: string }
  | null;

export async function uploadProjectFileAction(
  projectId: string,
  _prev: ProjectDriveUploadState,
  formData: FormData,
): Promise<ProjectDriveUploadState> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, message: "Database not configured." };
  }

  const { data: row, error: fetchErr } = await supabase
    .from("tracked_projects")
    .select("google_drive_folder_id")
    .eq("id", projectId)
    .maybeSingle();

  if (fetchErr || !row?.google_drive_folder_id) {
    return {
      ok: false,
      message: "This project has no Drive folder yet. Configure one on this page first.",
    };
  }

  const rawStep = String(formData.get("pipeline_step") ?? "").trim();
  const allowed = new Set<string>(WORKFLOW_STEPS.map((s) => s.key));
  if (!allowed.has(rawStep)) {
    return { ok: false, message: "Choose which pipeline activity this file is for." };
  }
  const pipelineStepLabel = workflowStepUploadFolderLabel(rawStep);

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, message: "Choose a file to upload." };
  }

  const ensured = await ensureChildFolderByName(row.google_drive_folder_id, pipelineStepLabel);
  if (!ensured.ok) {
    return { ok: false, message: ensured.error };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadFileToParentFolder(ensured.folderId, {
    rawName: file.name,
    mimeType: file.type,
    buffer,
  });

  if (!result.ok) {
    return { ok: false, message: result.error };
  }

  revalidatePath(`/projects/${projectId}/files`);
  revalidatePath(`/projects/${projectId}/work`);
  return {
    ok: true,
    kind: "upload" as const,
    fileName: result.name,
    driveFileId: result.id,
    pipelineStepLabel,
    mimeType: result.mimeType,
  };
}

export async function assignExistingProjectFileAction(
  projectId: string,
  _prev: ProjectDriveUploadState,
  formData: FormData,
): Promise<ProjectDriveUploadState> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, message: "Database not configured." };
  }

  const { data: row, error: fetchErr } = await supabase
    .from("tracked_projects")
    .select("google_drive_folder_id")
    .eq("id", projectId)
    .maybeSingle();

  if (fetchErr || !row?.google_drive_folder_id) {
    return {
      ok: false,
      message: "This project has no Drive folder yet. Configure one on this page first.",
    };
  }

  const rawStep = String(formData.get("pipeline_step") ?? "").trim();
  const allowed = new Set<string>(WORKFLOW_STEPS.map((s) => s.key));
  if (!allowed.has(rawStep)) {
    return { ok: false, message: "Choose which pipeline activity this file is for." };
  }
  const pipelineStepLabel = workflowStepUploadFolderLabel(rawStep);

  const fileId = String(formData.get("existing_drive_file_id") ?? "").trim();
  if (!fileId) {
    return { ok: false, message: "Select a file from your project folder, then attach." };
  }

  const ensured = await ensureChildFolderByName(row.google_drive_folder_id, pipelineStepLabel);
  if (!ensured.ok) {
    return { ok: false, message: ensured.error };
  }

  const moved = await moveDriveFileIntoPipelineFolder(fileId, row.google_drive_folder_id, ensured.folderId);
  if (!moved.ok) {
    return { ok: false, message: moved.error };
  }

  revalidatePath(`/projects/${projectId}/files`);
  revalidatePath(`/projects/${projectId}/work`);
  revalidatePath(`/projects/${projectId}`);
  return {
    ok: true,
    kind: "attach" as const,
    fileName: moved.name,
    driveFileId: fileId,
    pipelineStepLabel,
    mimeType: moved.mimeType,
  };
}
