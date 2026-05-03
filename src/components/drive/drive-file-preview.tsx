"use client";

import {
  canPreviewInBrowser,
  getDriveInlinePreviewKind,
  isProteusDesignFileName,
} from "@/lib/drive-preview-helpers";

const DEFAULT_FILE_API = "/api/drive/file";

function normalizeFileApiBase(fileApiBasePath?: string): string {
  const raw = (fileApiBasePath ?? DEFAULT_FILE_API).trim() || DEFAULT_FILE_API;
  return raw.replace(/\/$/, "");
}

function fileSrc(base: string, fileId: string): string {
  return `${base}/${encodeURIComponent(fileId)}`;
}

function fileDownloadHref(base: string, fileId: string): string {
  return `${fileSrc(base, fileId)}?download=1`;
}

function DownloadLink({
  fileId,
  fileName,
  fileApiBasePath,
}: {
  fileId: string;
  fileName: string;
  fileApiBasePath?: string;
}) {
  const base = normalizeFileApiBase(fileApiBasePath);
  return (
    <a
      href={fileDownloadHref(base, fileId)}
      download={fileName}
      className="text-dash-accent text-sm font-semibold underline-offset-2 hover:underline"
    >
      Download
    </a>
  );
}

function NoPreviewPanel({
  fileId,
  fileName,
  fileApiBasePath,
}: {
  fileId: string;
  fileName: string;
  fileApiBasePath?: string;
}) {
  return (
    <div className="border-dash-border bg-dash-muted/20 space-y-3 rounded-xl border px-4 py-3">
      <p className="text-dash-muted-foreground text-sm">
        {isProteusDesignFileName(fileName)
          ? "Proteus files can't be previewed here—download to open in Proteus."
          : "This file can't be previewed in the browser."}
      </p>
      <DownloadLink fileId={fileId} fileName={fileName} fileApiBasePath={fileApiBasePath} />
    </div>
  );
}

export function DriveFilePreview({
  mimeType,
  fileId,
  fileName,
  fileApiBasePath,
}: {
  mimeType: string;
  fileId: string;
  fileName: string;
  /** Base path without trailing slash, e.g. `/api/drive/file` or `/api/share/TOKEN/file`. */
  fileApiBasePath?: string;
}) {
  const base = normalizeFileApiBase(fileApiBasePath);
  const src = fileSrc(base, fileId);

  if (!canPreviewInBrowser(mimeType, fileName)) {
    return <NoPreviewPanel fileId={fileId} fileName={fileName} fileApiBasePath={fileApiBasePath} />;
  }

  const kind = getDriveInlinePreviewKind(mimeType, fileName);

  if (kind === "image") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <DownloadLink fileId={fileId} fileName={fileName} fileApiBasePath={fileApiBasePath} />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- proxied Drive bytes; no optimization CDN */}
        <img src={src} alt={fileName} className="border-dash-border max-h-[min(85vh,920px)] w-auto max-w-full rounded-xl border shadow-sm" />
      </div>
    );
  }

  if (kind === "iframe_document") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <DownloadLink fileId={fileId} fileName={fileName} fileApiBasePath={fileApiBasePath} />
        </div>
        <iframe
          title={fileName}
          src={src}
          className="border-dash-border min-h-[min(85vh,920px)] w-full flex-1 rounded-xl border shadow-sm"
        />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <DownloadLink fileId={fileId} fileName={fileName} fileApiBasePath={fileApiBasePath} />
        </div>
        <video src={src} controls className="border-dash-border max-h-[85vh] w-full max-w-5xl rounded-xl border shadow-sm" />
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <DownloadLink fileId={fileId} fileName={fileName} fileApiBasePath={fileApiBasePath} />
        </div>
        <audio src={src} controls className="border-dash-border w-full max-w-xl rounded-lg border p-2" />
      </div>
    );
  }

  if (kind === "text_iframe") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <DownloadLink fileId={fileId} fileName={fileName} fileApiBasePath={fileApiBasePath} />
        </div>
        <iframe
          title={fileName}
          src={src}
          className="border-dash-border bg-white font-mono text-sm dark:bg-slate-950 min-h-[70vh] w-full rounded-xl border shadow-sm"
        />
      </div>
    );
  }

  return <NoPreviewPanel fileId={fileId} fileName={fileName} fileApiBasePath={fileApiBasePath} />;
}
