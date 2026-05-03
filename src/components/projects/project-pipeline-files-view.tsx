import Link from "next/link";

import { canPreviewInBrowser } from "@/lib/drive-preview-helpers";
import type { ProjectPipelineActivityFiles } from "@/lib/project-pipeline-files";

function formatBytes(size: string | null): string {
  if (!size) return "—";
  const n = Number(size);
  if (Number.isNaN(n)) return size;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectPipelineFilesViewSection({
  projectId,
  activities,
  shareToken,
}: {
  projectId: string;
  activities: ProjectPipelineActivityFiles[];
  /** When set, links stay on the public share host (no internal app URLs). */
  shareToken?: string;
}) {
  const encToken = shareToken ? encodeURIComponent(shareToken) : "";
  const previewHref = (fileId: string) =>
    shareToken
      ? `/share/${encToken}/view/${encodeURIComponent(fileId)}`
      : `/drive/view/${encodeURIComponent(fileId)}`;
  const downloadHref = (fileId: string) =>
    shareToken
      ? `/api/share/${encToken}/file/${encodeURIComponent(fileId)}?download=1`
      : `/api/drive/file/${encodeURIComponent(fileId)}?download=1`;

  return (
    <section
      className="border-dash-border bg-dash-card mb-10 scroll-mt-28 rounded-2xl border p-5 shadow-sm sm:p-6"
      aria-labelledby="pipeline-files-heading"
    >
      <h2 id="pipeline-files-heading" className="text-dash-foreground mb-1 text-lg font-semibold">
        Files by pipeline activity
      </h2>
      <p className="text-dash-muted-foreground mb-6 text-sm">
        {shareToken ? (
          <>
            Preview appears only when the file type can open in your browser; otherwise use Download. This shared page
            only includes this project.
          </>
        ) : (
          <>
            Uploads from Manage are grouped under each pipeline step. Preview appears only when the file type can open
            in-app; otherwise use Download. Open the full{" "}
            <Link href={`/projects/${projectId}/files`} className="text-dash-accent font-medium underline-offset-2 hover:underline">
              project Files
            </Link>{" "}
            browser.
          </>
        )}
      </p>

      <div className="space-y-3">
        {activities.map((a) => (
          <details
            key={a.key}
            className="border-dash-border group rounded-xl border open:bg-dash-muted/20"
            open={a.files.length > 0}
          >
            <summary className="text-dash-foreground flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <span>
                {a.label}
                <span className="text-dash-muted-foreground ml-2 font-normal tabular-nums">
                  ({a.files.length} file{a.files.length === 1 ? "" : "s"})
                </span>
              </span>
              <span className="text-dash-muted-foreground text-xs font-normal group-open:rotate-180">▼</span>
            </summary>
            <div className="border-dash-border border-t px-3 pb-3 pt-1 sm:px-4">
              {a.listError ? (
                <p className="text-red-600 dark:text-red-300 px-1 py-2 text-sm" role="alert">
                  {a.listError}
                </p>
              ) : a.files.length === 0 ? (
                <p className="text-dash-muted-foreground px-1 py-3 text-sm">
                  No files in this activity folder yet
                  {!a.folderId ? " (folder appears after first upload or attach from Manage / Files)" : ""}.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="divide-dash-border min-w-full divide-y text-sm">
                    <thead>
                      <tr className="text-dash-muted-foreground text-left text-xs font-semibold uppercase">
                        <th className="px-2 py-2">Name</th>
                        <th className="hidden px-2 py-2 sm:table-cell">Size</th>
                        <th className="px-2 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-dash-border divide-y">
                      {a.files.map((f) => (
                        <tr key={f.id} className="hover:bg-dash-muted/40">
                          <td className="text-dash-foreground max-w-[min(48vw,280px)] truncate px-2 py-2.5 font-medium">
                            {f.name}
                          </td>
                          <td className="text-dash-muted-foreground hidden px-2 py-2.5 text-xs tabular-nums sm:table-cell">
                            {formatBytes(f.size)}
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                              {canPreviewInBrowser(f.mimeType, f.name) ? (
                                <Link
                                  href={previewHref(f.id)}
                                  className="text-dash-accent text-xs font-semibold underline-offset-2 hover:underline"
                                >
                                  Preview
                                </Link>
                              ) : null}
                              <a
                                href={downloadHref(f.id)}
                                download={f.name}
                                className="text-dash-accent text-[11px] font-semibold underline-offset-2 hover:underline"
                              >
                                Download
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
