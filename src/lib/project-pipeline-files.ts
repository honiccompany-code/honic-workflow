import { listDriveFolder, type DriveFileRow } from "@/lib/google-drive-server";
import { WORKFLOW_STEPS, workflowStepUploadFolderLabel } from "@/lib/workflow-checklist";

export type ProjectPipelineActivityFiles = {
  key: string;
  label: string;
  folderId: string | null;
  files: DriveFileRow[];
  listError?: string;
};

/**
 * For each pipeline step, find the matching subfolder under the project Drive folder (same names as uploads)
 * and list files inside for the project view page.
 */
export async function loadProjectPipelineFilesForView(
  projectDriveFolderId: string,
): Promise<{ ok: true; activities: ProjectPipelineActivityFiles[] } | { ok: false; error: string }> {
  const rootList = await listDriveFolder({ parentFolderId: projectDriveFolderId });
  if (!rootList.ok) {
    return { ok: false, error: rootList.error };
  }

  const childFolders = rootList.files.filter((f) => f.mimeType === "application/vnd.google-apps.folder");

  const activities: ProjectPipelineActivityFiles[] = await Promise.all(
    WORKFLOW_STEPS.map(async (step) => {
      const folderName = workflowStepUploadFolderLabel(step.key);
      const folder = childFolders.find((f) => f.name === folderName);
      if (!folder?.id) {
        return { key: step.key, label: step.label, folderId: null, files: [] };
      }
      const inner = await listDriveFolder({ parentFolderId: folder.id });
      if (!inner.ok) {
        return { key: step.key, label: step.label, folderId: folder.id, files: [], listError: inner.error };
      }
      const files = inner.files.filter((f) => f.mimeType !== "application/vnd.google-apps.folder");
      return { key: step.key, label: step.label, folderId: folder.id, files };
    }),
  );

  return { ok: true, activities };
}
