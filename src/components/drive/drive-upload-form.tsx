"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { DriveUploadActionState } from "@/app/drive/upload/actions";
import { uploadDriveFileAction } from "@/app/drive/upload/actions";
import { canPreviewInBrowser } from "@/lib/drive-preview-helpers";

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-dash-accent hover:bg-dash-accent-dim rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      Upload to folder
    </button>
  );
}

export function DriveUploadForm() {
  const [state, formAction, isPending] = useActionState<DriveUploadActionState, FormData>(
    uploadDriveFileAction,
    null,
  );

  return (
    <div className="border-dash-border bg-dash-card rounded-2xl border p-6 shadow-sm">
      <form action={formAction} className="space-y-5">
        <div>
          <label htmlFor="drive-file" className="text-dash-foreground mb-2 block text-sm font-medium">
            File
          </label>
          <input
            id="drive-file"
            name="file"
            type="file"
            required
            disabled={isPending}
            className="border-dash-border bg-dash-muted/30 text-dash-foreground file:text-dash-foreground w-full max-w-lg cursor-pointer rounded-xl border px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white dark:file:bg-slate-500"
          />
          <p className="text-dash-muted-foreground mt-2 text-xs">
            Max size defaults to 50 MB; set <code className="text-dash-foreground">DRIVE_UPLOAD_MAX_MB</code> to change.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pending={isPending} />
          {isPending ? <span className="text-dash-muted-foreground text-sm">Uploading…</span> : null}
        </div>
      </form>

      {state && !state.ok ? (
        <p className="text-red-600 dark:text-red-300 mt-4 whitespace-pre-line text-sm" role="alert">
          {state.message}
        </p>
      ) : null}

      {state?.ok ? (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100">
          <p className="font-medium">Uploaded “{state.fileName}”.</p>
          <div className="mt-2 flex flex-wrap gap-4">
            {canPreviewInBrowser(state.mimeType, state.fileName) ? (
              <Link
                href={`/drive/view/${encodeURIComponent(state.driveFileId)}`}
                className="text-dash-accent font-semibold underline-offset-2 hover:underline"
              >
                Preview
              </Link>
            ) : null}
            <a
              href={`/api/drive/file/${encodeURIComponent(state.driveFileId)}?download=1`}
              download={state.fileName}
              className="text-dash-accent font-semibold underline-offset-2 hover:underline"
            >
              Download
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
