import Link from "next/link";

import { canPreviewInBrowser } from "@/lib/drive-preview-helpers";
import type { DriveFileRow } from "@/lib/google-drive-server";

function formatBytes(size: string | null): string {
  if (!size) return "—";
  const n = Number(size);
  if (Number.isNaN(n)) return size;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatIso(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function DriveExplorerTable({
  files,
  backHref,
}: {
  files: DriveFileRow[];
  /** When browsing a subfolder, link back to parent listing. */
  backHref?: string | null;
}) {
  return (
    <section className="border-dash-border bg-dash-card overflow-hidden rounded-2xl border shadow-sm">
      {backHref ? (
        <div className="border-dash-border flex flex-wrap items-center justify-end gap-3 border-b px-5 py-3">
          <Link
            href={backHref}
            className="text-dash-accent hover:text-dash-accent-dim text-xs font-semibold underline-offset-2 hover:underline"
          >
            ↑ Parent folder
          </Link>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="divide-dash-border min-w-[640px] w-full divide-y text-sm">
          <thead className="bg-dash-muted/80">
            <tr className="text-dash-muted-foreground text-left text-xs font-semibold tracking-wide uppercase">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="hidden px-4 py-3 sm:table-cell">Modified</th>
              <th className="hidden px-4 py-3 md:table-cell">Size</th>
              <th className="px-4 py-3 text-right">View</th>
            </tr>
          </thead>
          <tbody className="divide-dash-border divide-y">
            {files.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-dash-muted-foreground px-4 py-10 text-center">
                  This folder is empty.
                </td>
              </tr>
            ) : (
              files.map((f) => {
                const isFolder = f.mimeType === "application/vnd.google-apps.folder";
                const inAppHref = isFolder ? `/drive/folder/${f.id}` : `/drive/view/${f.id}`;
                return (
                  <tr key={f.id} className="hover:bg-dash-muted/40">
                    <td className="text-dash-foreground px-4 py-3 font-medium">{f.name}</td>
                    <td className="text-dash-muted-foreground px-4 py-3 text-xs">
                      {isFolder ? "Folder" : f.mimeType.replace("application/", "")}
                    </td>
                    <td className="text-dash-muted-foreground hidden px-4 py-3 text-xs tabular-nums sm:table-cell">
                      {formatIso(f.modifiedTime)}
                    </td>
                    <td className="text-dash-muted-foreground hidden px-4 py-3 text-xs md:table-cell">
                      {isFolder ? "—" : formatBytes(f.size)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                        {isFolder ? (
                          <Link
                            href={inAppHref}
                            className="text-dash-accent text-xs font-semibold underline-offset-2 hover:underline"
                          >
                            Open folder
                          </Link>
                        ) : canPreviewInBrowser(f.mimeType, f.name) ? (
                          <>
                            <Link
                              href={inAppHref}
                              className="text-dash-accent text-xs font-semibold underline-offset-2 hover:underline"
                            >
                              Preview
                            </Link>
                            <a
                              href={`/api/drive/file/${encodeURIComponent(f.id)}?download=1`}
                              download={f.name}
                              className="text-dash-accent text-[11px] font-semibold underline-offset-2 hover:underline"
                            >
                              Download
                            </a>
                          </>
                        ) : (
                          <a
                            href={`/api/drive/file/${encodeURIComponent(f.id)}?download=1`}
                            download={f.name}
                            className="text-dash-accent text-xs font-semibold underline-offset-2 hover:underline"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
