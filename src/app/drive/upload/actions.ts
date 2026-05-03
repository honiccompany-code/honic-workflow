"use server";

import { revalidatePath } from "next/cache";

import { uploadFileToConfiguredFolder } from "@/lib/google-drive-server";

export type DriveUploadActionState =
  | { ok: true; fileName: string; driveFileId: string; mimeType: string }
  | { ok: false; message: string }
  | null;

export async function uploadDriveFileAction(
  _prev: DriveUploadActionState,
  formData: FormData,
): Promise<DriveUploadActionState> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, message: "Choose a file to upload." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadFileToConfiguredFolder({
    rawName: file.name,
    mimeType: file.type,
    buffer,
  });

  if (!result.ok) {
    return { ok: false, message: result.error };
  }

  revalidatePath("/drive");
  revalidatePath("/drive/upload");

  return { ok: true, fileName: result.name, driveFileId: result.id, mimeType: result.mimeType };
}
