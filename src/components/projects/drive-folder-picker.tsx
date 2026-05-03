"use client";

import { useCallback, useEffect, useState } from "react";

import { listDriveFoldersForPicker } from "@/app/projects/drive-picker-actions";

type StackEntry = { id: string; name: string };

/** `parent_for_new`: folderId is parent where a new subfolder will be created. `existing_project_folder`: folderId is the project folder to use. */
export function DriveFolderPicker({
  hiddenInputName,
  purpose = "parent_for_new",
}: {
  hiddenInputName?: string;
  purpose?: "parent_for_new" | "existing_project_folder";
}) {
  const resolvedHiddenName =
    hiddenInputName ??
    (purpose === "existing_project_folder" ? "drive_existing_folder_id" : "drive_parent_folder_id");
  const [linkedRootId, setLinkedRootId] = useState<string | null>(null);
  const [stack, setStack] = useState<StackEntry[]>([]);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");

  const parentIdForFetch: string | null = stack.length === 0 ? null : stack[stack.length - 1].id;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listDriveFoldersForPicker(parentIdForFetch);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      setFolders([]);
      return;
    }
    setLinkedRootId(res.linkedRootId);
    setFolders(res.folders);
  }, [parentIdForFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentFolderId =
    stack.length === 0 ? linkedRootId : stack[stack.length - 1]?.id ?? null;
  const currentLabel = stack.length === 0 ? "Linked root folder" : stack[stack.length - 1].name;

  /** For "use existing folder", the folder you are viewing is what we submit (no extra confirm click). For "create under parent", selection only counts after you click the confirm button. */
  const hiddenFormValue =
    purpose === "existing_project_folder" ? (currentFolderId ?? "") : selectedId;

  function enterFolder(f: StackEntry) {
    setStack((s) => [...s, f]);
  }

  function breadcrumbTo(index: number) {
    if (index < 0) setStack([]);
    else setStack((s) => s.slice(0, index + 1));
  }

  function useCurrentFolder() {
    if (purpose === "parent_for_new" && currentFolderId) setSelectedId(currentFolderId);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={resolvedHiddenName} value={hiddenFormValue} />

      {error ? (
        <p className="text-red-600 dark:text-red-300 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <nav className="text-dash-muted-foreground flex flex-wrap items-center gap-1 text-xs">
        <button
          type="button"
          onClick={() => breadcrumbTo(-1)}
          className="text-dash-accent hover:text-dash-accent-dim font-medium underline-offset-2 hover:underline"
        >
          Drive root
        </button>
        {stack.map((seg, i) => (
          <span key={seg.id} className="flex items-center gap-1">
            <span aria-hidden>/</span>
            <button
              type="button"
              onClick={() => breadcrumbTo(i)}
              className="text-dash-accent hover:text-dash-accent-dim font-medium underline-offset-2 hover:underline"
            >
              {seg.name}
            </button>
          </span>
        ))}
      </nav>

      {loading ? (
        <p className="text-dash-muted-foreground text-sm">Loading folders…</p>
      ) : (
        <ul className="border-dash-border divide-dash-border max-h-52 divide-y overflow-y-auto rounded-xl border">
          {folders.length === 0 ? (
            <li className="text-dash-muted-foreground px-3 py-4 text-sm">No subfolders in this location.</li>
          ) : (
            folders.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="text-dash-foreground min-w-0 truncate text-sm font-medium">{f.name}</span>
                <button
                  type="button"
                  onClick={() => enterFolder({ id: f.id, name: f.name })}
                  className="text-dash-accent shrink-0 text-xs font-semibold underline-offset-2 hover:underline"
                >
                  Open →
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {purpose === "parent_for_new" ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={useCurrentFolder}
            disabled={!currentFolderId || loading}
            className="border-dash-border bg-dash-muted/40 text-dash-foreground hover:bg-dash-muted/60 disabled:opacity-50 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
          >
            Use &quot;{currentLabel}&quot; as parent folder
          </button>
        </div>
      ) : null}

      {purpose === "parent_for_new" ? (
        selectedId ? (
          <p className="text-dash-muted-foreground text-xs">
            Parent folder selected. A new project folder will be created here when you submit.
          </p>
        ) : (
          <p className="text-dash-muted-foreground text-xs">
            Navigate with Open, then confirm the parent folder with the button above.
          </p>
        )
      ) : hiddenFormValue ? (
        <p className="text-dash-muted-foreground text-xs">
          Project folder: &quot;{currentLabel}&quot;. Submit the form to use this folder (change location with Open or
          breadcrumbs).
        </p>
      ) : loading ? (
        <p className="text-dash-muted-foreground text-xs">Loading linked Drive folder…</p>
      ) : error ? (
        <p className="text-dash-muted-foreground text-xs">Fix the error above before continuing.</p>
      ) : (
        <p className="text-dash-muted-foreground text-xs">Drive folder is not ready yet.</p>
      )}
    </div>
  );
}
