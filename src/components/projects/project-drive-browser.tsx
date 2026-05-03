"use client";

import { useCallback, useEffect, useState } from "react";

import { listProjectDriveChildren } from "@/app/projects/drive-picker-actions";

type StackEntry = { id: string; name: string };

export function ProjectDriveBrowser({
  projectId,
  selectedFileId,
  onSelectFile,
}: {
  projectId: string;
  selectedFileId: string;
  onSelectFile: (id: string) => void;
}) {
  const [stack, setStack] = useState<StackEntry[]>([]);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [listedFolderId, setListedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parentIdForFetch: string | null = stack.length === 0 ? null : stack[stack.length - 1].id;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listProjectDriveChildren(projectId, parentIdForFetch);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      setFolders([]);
      setFiles([]);
      setListedFolderId(null);
      return;
    }
    setFolders(res.folders);
    setFiles(res.files);
    setListedFolderId(res.listedFolderId);
  }, [projectId, parentIdForFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  function enterFolder(f: StackEntry) {
    setStack((s) => [...s, f]);
  }

  function breadcrumbTo(index: number) {
    if (index < 0) setStack([]);
    else setStack((s) => s.slice(0, index + 1));
  }

  return (
    <div className="space-y-3">
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
          Project folder
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
        <p className="text-dash-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="border-dash-border max-h-64 overflow-y-auto rounded-xl border">
          {folders.length === 0 && files.length === 0 ? (
            <p className="text-dash-muted-foreground px-3 py-4 text-sm">This folder is empty.</p>
          ) : (
            <ul className="divide-dash-border divide-y">
              {folders.map((f) => (
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
              ))}
              {files.map((f) => (
                <li key={f.id} className="px-3 py-2.5">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="existing_drive_file_pick"
                      checked={selectedFileId === f.id}
                      onChange={() => onSelectFile(f.id)}
                      className="border-dash-border text-dash-accent h-4 w-4 shrink-0"
                    />
                    <span className="text-dash-foreground min-w-0 truncate text-sm font-medium">{f.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {listedFolderId && !loading && !error ? (
        <p className="text-dash-muted-foreground text-xs">
          Select a file with the radio control, then attach. Folders are for navigation only; the file will move into
          the pipeline activity folder you choose above.
        </p>
      ) : null}
    </div>
  );
}
