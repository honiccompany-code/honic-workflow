"use client";

import { useId, useRef } from "react";
import { useFormStatus } from "react-dom";

import { deleteTrackedProject } from "@/app/projects/actions";

function DialogDeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-red-600 hover:bg-red-700 disabled:opacity-60 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
    >
      {pending ? "Deleting…" : "Delete project"}
    </button>
  );
}

export function DeleteTrackedProjectButton({ projectId, title }: { projectId: string; title: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="border-red-500/35 text-red-600 hover:bg-red-500/10 dark:text-red-400 inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors"
      >
        Delete
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDialog();
        }}
        className="text-dash-foreground fixed inset-0 z-[100] m-0 hidden min-h-[100dvh] w-full max-w-none items-center justify-center border-0 bg-transparent p-4 sm:p-6 [&[open]]:flex [&::backdrop]:bg-black/50 [&::backdrop]:backdrop-blur-sm"
      >
        <div
          className="border-dash-border bg-dash-card text-dash-foreground w-full max-w-md rounded-2xl border p-6 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.06] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] dark:ring-white/[0.08]"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id={titleId} className="text-dash-foreground text-lg font-semibold tracking-tight">
            Delete project?
          </h2>
          <p id={descId} className="text-dash-muted-foreground mt-3 text-sm leading-relaxed">
            <span className="text-dash-foreground font-medium">&quot;{title}&quot;</span> will be removed. Milestones and
            tasks for this project will be deleted. This cannot be undone.
          </p>

          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={closeDialog}
              className="border-dash-border bg-dash-muted hover:bg-dash-border text-dash-foreground rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <form action={deleteTrackedProject} className="inline">
              <input type="hidden" name="tracked_project_id" value={projectId} />
              <DialogDeleteSubmit />
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
