"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import type { ProjectDriveUploadState } from "@/app/projects/[id]/files/actions";
import {
  assignExistingProjectFileAction,
  uploadProjectFileAction,
} from "@/app/projects/[id]/files/actions";
import { ProjectDriveBrowser } from "@/components/projects/project-drive-browser";
import { canPreviewInBrowser } from "@/lib/drive-preview-helpers";
import { WORKFLOW_STEPS, type WorkflowStepKey } from "@/lib/workflow-checklist";

function UploadSubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-dash-accent hover:bg-dash-accent-dim rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      Upload to project folder
    </button>
  );
}

function AttachSubmitButton({ pending, disabled }: { pending: boolean; disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="bg-dash-accent hover:bg-dash-accent-dim rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      Move file into activity folder
    </button>
  );
}

export function ProjectDriveUploadForm({
  projectId,
  defaultPipelineStep = "schematic_circuit",
  heading = "Upload files",
  intro,
}: {
  projectId: string;
  /** Defaults the pipeline activity selector (matches checklist steps). */
  defaultPipelineStep?: WorkflowStepKey;
  heading?: string;
  intro?: string;
}) {
  const [mode, setMode] = useState<"upload" | "attach">("upload");
  const [selectedFileId, setSelectedFileId] = useState("");

  const boundUpload = uploadProjectFileAction.bind(null, projectId);
  const [uploadState, uploadAction, uploadPending] = useActionState<ProjectDriveUploadState, FormData>(
    boundUpload,
    null,
  );

  const boundAttach = assignExistingProjectFileAction.bind(null, projectId);
  const [attachState, attachAction, attachPending] = useActionState<ProjectDriveUploadState, FormData>(
    boundAttach,
    null,
  );

  useEffect(() => {
    if (mode === "upload") setSelectedFileId("");
  }, [mode]);

  const stepDefault = WORKFLOW_STEPS.some((s) => s.key === defaultPipelineStep)
    ? defaultPipelineStep
    : "schematic_circuit";

  const activeState = mode === "upload" ? uploadState : attachState;

  return (
    <div className="border-dash-border bg-dash-card mb-8 rounded-2xl border p-6 shadow-sm">
      <h3 className="text-dash-foreground mb-1 text-sm font-semibold">{heading}</h3>
      {intro ? <p className="text-dash-muted-foreground mb-4 text-xs leading-relaxed">{intro}</p> : null}

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            mode === "upload"
              ? "bg-dash-accent text-slate-950"
              : "border-dash-border bg-dash-muted/30 text-dash-foreground hover:bg-dash-muted/50 border"
          }`}
        >
          Upload new file
        </button>
        <button
          type="button"
          onClick={() => setMode("attach")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
            mode === "attach"
              ? "bg-dash-accent text-slate-950"
              : "border-dash-border bg-dash-muted/30 text-dash-foreground hover:bg-dash-muted/50 border"
          }`}
        >
          Use file already in project folder
        </button>
      </div>

      {mode === "upload" ? (
        <form action={uploadAction} className="space-y-5">
          <div>
            <label
              htmlFor={`pipeline-step-upload-${projectId}`}
              className="text-dash-foreground mb-2 block text-sm font-medium"
            >
              File is for which pipeline activity?
            </label>
            <select
              id={`pipeline-step-upload-${projectId}`}
              name="pipeline_step"
              required
              disabled={uploadPending}
              defaultValue={stepDefault}
              className="border-dash-border bg-dash-muted/30 text-dash-foreground focus:ring-dash-accent/25 mb-1 w-full max-w-lg rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
            >
              {WORKFLOW_STEPS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-dash-muted-foreground text-xs">
              Files go under your project Drive folder in a subfolder named for this pipeline step (same steps as the
              checklist above).
            </p>
          </div>

          <div>
            <label
              htmlFor={`project-file-${projectId}`}
              className="text-dash-foreground mb-2 block text-sm font-medium"
            >
              File
            </label>
            <input
              id={`project-file-${projectId}`}
              name="file"
              type="file"
              required
              disabled={uploadPending}
              className="border-dash-border bg-dash-muted/30 text-dash-foreground file:text-dash-foreground w-full max-w-lg cursor-pointer rounded-xl border px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white dark:file:bg-slate-500"
            />
            <p className="text-dash-muted-foreground mt-2 text-xs">
              Images, videos, PDFs, CAD, archives — any type the browser can pick. Same max size as global Drive upload (
              <code className="text-dash-foreground">DRIVE_UPLOAD_MAX_MB</code>).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <UploadSubmitButton pending={uploadPending} />
            {uploadPending ? <span className="text-dash-muted-foreground text-sm">Uploading…</span> : null}
          </div>
        </form>
      ) : (
        <form action={attachAction} className="space-y-5">
          <div>
            <label
              htmlFor={`pipeline-step-attach-${projectId}`}
              className="text-dash-foreground mb-2 block text-sm font-medium"
            >
              Move into which pipeline activity folder?
            </label>
            <select
              id={`pipeline-step-attach-${projectId}`}
              name="pipeline_step"
              required
              disabled={attachPending}
              defaultValue={stepDefault}
              className="border-dash-border bg-dash-muted/30 text-dash-foreground focus:ring-dash-accent/25 mb-1 w-full max-w-lg rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
            >
              {WORKFLOW_STEPS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-dash-muted-foreground text-xs">
              Open subfolders if needed, then select a file. It will be moved into the activity subfolder (not copied).
            </p>
          </div>

          <input type="hidden" name="existing_drive_file_id" value={selectedFileId} />

          <div>
            <p className="text-dash-foreground mb-2 text-sm font-medium">Browse project Drive folder</p>
            <ProjectDriveBrowser
              projectId={projectId}
              selectedFileId={selectedFileId}
              onSelectFile={setSelectedFileId}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AttachSubmitButton pending={attachPending} disabled={!selectedFileId} />
            {attachPending ? <span className="text-dash-muted-foreground text-sm">Moving…</span> : null}
          </div>
        </form>
      )}

      {activeState && !activeState.ok ? (
        <p className="text-red-600 dark:text-red-300 mt-4 whitespace-pre-line text-sm" role="alert">
          {activeState.message}
        </p>
      ) : null}

      {activeState?.ok ? (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100">
          <p className="font-medium">
            {activeState.kind === "attach" ? "Moved" : "Uploaded"} &quot;{activeState.fileName}&quot; under pipeline
            folder &quot;{activeState.pipelineStepLabel}&quot;.
          </p>
          <div className="mt-2 flex flex-wrap gap-4">
            {canPreviewInBrowser(activeState.mimeType, activeState.fileName) ? (
              <Link
                href={`/drive/view/${encodeURIComponent(activeState.driveFileId)}`}
                className="text-dash-accent font-semibold underline-offset-2 hover:underline"
              >
                Preview
              </Link>
            ) : null}
            <a
              href={`/api/drive/file/${encodeURIComponent(activeState.driveFileId)}?download=1`}
              download={activeState.fileName}
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
