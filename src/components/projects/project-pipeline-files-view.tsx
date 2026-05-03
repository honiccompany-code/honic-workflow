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
  sectionId,
}: {
  projectId: string;
  activities: ProjectPipelineActivityFiles[];
  /** When set, links stay on the public share host (no internal app URLs). */
  shareToken?: string;
  /** Anchor id for in-page navigation (e.g. public share page). */
  sectionId?: string;
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
      id={sectionId}
      className="border-dash-border bg-dash-card mb-10 scroll-mt-28 rounded-3xl border p-5 shadow-sm sm:mb-12 sm:p-6 sm:shadow-md"
      aria-labelledby="pipeline-files-heading"
    >
      <h2 id="pipeline-files-heading" className="text-dash-foreground mb-1 text-lg font-bold tracking-tight sm:text-xl">
        Files by pipeline activity
      </h2>
      <p className="text-dash-muted-foreground mb-6 max-w-2xl text-sm leading-relaxed">
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

      <div className="space-y-3 sm:space-y-4">
        {activities.map((a) => (
          <details
            key={a.key}
            className="border-dash-border group rounded-2xl border bg-dash-muted/10 open:bg-dash-muted/25 transition-colors"
            open={a.files.length > 0}
          >
            <summary className="text-dash-foreground flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-dash-muted/30 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block truncate">{a.label}</span>
                <span className="text-dash-muted-foreground mt-0.5 block text-xs font-normal tabular-nums">
                  {a.files.length} file{a.files.length === 1 ? "" : "s"}
                </span>
              </span>
              <span
                className="text-dash-muted-foreground shrink-0 rounded-full border border-transparent bg-dash-card/80 px-2 py-1 text-xs font-normal transition-transform group-open:rotate-180"
                aria-hidden
              >
                ▼
              </span>
            </summary>
            <div className="border-dash-border border-t px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
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
                <>
                  <ul className="flex flex-col gap-2.5 sm:hidden">
                    {a.files.map((f) => (
                      <li key={f.id} className="border-dash-border bg-dash-card/70 rounded-2xl border p-4 shadow-sm">
                        <div className="flex flex-col gap-3">
                          <div className="min-w-0">
                            <p className="text-dash-foreground text-sm font-semibold leading-snug break-words">{f.name}</p>
                            <p className="text-dash-muted-foreground mt-1 text-xs tabular-nums">{formatBytes(f.size)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {canPreviewInBrowser(f.mimeType, f.name) ? (
                              <Link
                                href={previewHref(f.id)}
                                className="border-dash-border bg-dash-accent/10 text-dash-accent-dim hover:bg-dash-accent/20 focus-visible:ring-dash-accent inline-flex min-h-11 min-w-[6.5rem] flex-1 items-center justify-center rounded-xl border text-center text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                              >
                                Preview
                              </Link>
                            ) : null}
                            <a
                              href={downloadHref(f.id)}
                              download={f.name}
                              className="border-dash-border bg-dash-card text-dash-foreground hover:border-dash-accent/35 focus-visible:ring-dash-accent inline-flex min-h-11 min-w-[6.5rem] flex-1 items-center justify-center rounded-xl border text-center text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="divide-dash-border min-w-full divide-y text-sm">
                      <thead>
                        <tr className="text-dash-muted-foreground text-left text-xs font-semibold uppercase">
                          <th className="px-2 py-2">Name</th>
                          <th className="hidden px-2 py-2 md:table-cell">Size</th>
                          <th className="px-2 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-dash-border divide-y">
                        {a.files.map((f) => (
                          <tr key={f.id} className="hover:bg-dash-muted/40">
                            <td className="text-dash-foreground max-w-[min(40vw,320px)] truncate px-2 py-2.5 font-medium md:max-w-md">
                              {f.name}
                            </td>
                            <td className="text-dash-muted-foreground hidden px-2 py-2.5 text-xs tabular-nums md:table-cell">
                              {formatBytes(f.size)}
                            </td>
                            <td className="px-2 py-2.5 text-right">
                              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                                {canPreviewInBrowser(f.mimeType, f.name) ? (
                                  <Link
                                    href={previewHref(f.id)}
                                    className="text-dash-accent hover:text-dash-accent-dim text-xs font-semibold underline-offset-2 hover:underline"
                                  >
                                    Preview
                                  </Link>
                                ) : null}
                                <a
                                  href={downloadHref(f.id)}
                                  download={f.name}
                                  className="text-dash-accent hover:text-dash-accent-dim text-xs font-semibold underline-offset-2 hover:underline"
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
                </>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
