/** Labcenter Proteus / ISIS / ARES design extensions (lowercase, no dot). */
const PROTEUS_DESIGN_EXTENSIONS = new Set([
  "pdsprj", // project
  "dsn", // schematic (ISIS)
  "lyt", // PCB layout (ARES)
  "lym", // mechanical / mould tooling
]);

/**
 * Heuristic: file name looks like a Proteus design file. Drive often reports these as
 * `application/octet-stream`; they cannot be inlined in a browser.
 */
export function isProteusDesignFileName(fileName: string): boolean {
  const s = fileName.trim().toLowerCase();
  const i = s.lastIndexOf(".");
  if (i < 0 || i === s.length - 1) return false;
  return PROTEUS_DESIGN_EXTENSIONS.has(s.slice(i + 1));
}

/** What the in-app viewer can render (matches `DriveFilePreview` capabilities). */
export type DriveInlinePreviewKind =
  | "image"
  | "iframe_document" // PDF, Google Workspace export, HTML
  | "video"
  | "audio"
  | "text_iframe"
  | "none";

export function getDriveInlinePreviewKind(mimeType: string, fileName: string): DriveInlinePreviewKind {
  if (isProteusDesignFileName(fileName)) return "none";

  const m = (mimeType || "application/octet-stream").trim().toLowerCase();

  if (m.startsWith("image/")) return "image";
  if (m === "application/pdf" || m.startsWith("application/vnd.google-apps.") || m === "text/html") {
    return "iframe_document";
  }
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("text/") || m === "application/json" || m === "application/xml") return "text_iframe";

  return "none";
}

export function canPreviewInBrowser(mimeType: string, fileName: string): boolean {
  return getDriveInlinePreviewKind(mimeType, fileName) !== "none";
}
