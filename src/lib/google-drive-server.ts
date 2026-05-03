import fs from "node:fs";
import path from "node:path";
import { Readable, type Readable as ReadableStreamType } from "node:stream";

import type { drive_v3 } from "googleapis";
import { google } from "googleapis";

import { getGoogleOAuthRedirectUri } from "@/lib/site-url";

export type DriveFileRow = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  size: string | null;
  webViewLink: string | null;
};

/** Shared folder listing + uploads (JWT service account). */
export type DriveServerContext = {
  folderId: string;
  clientEmail: string;
  privateKey: string;
};

const SCOPE_READONLY = "https://www.googleapis.com/auth/drive.readonly" as const;
const SCOPE_READWRITE = "https://www.googleapis.com/auth/drive" as const;

function parsePrivateKey(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  return raw.replace(/\\n/g, "\n");
}

/** Accepts raw folder ID or full `drive.google.com/.../folders/ID` URL from env. */
export function resolveDriveFolderId(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  const fromUrl = s.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (fromUrl) return fromUrl[1];
  if (/^[a-zA-Z0-9_-]+$/.test(s)) return s;
  return null;
}

function isServiceAccountEmail(email: string): boolean {
  return email.includes(".gserviceaccount.com");
}

function credentialsFromParsedJson(o: { client_email?: string; private_key?: string }): {
  client_email: string;
  private_key: string;
} | null {
  if (!o.client_email || !o.private_key) return null;
  return {
    client_email: o.client_email,
    private_key: o.private_key.replace(/\\n/g, "\n"),
  };
}

/** Load JSON key file from disk (avoids .env escaping issues on Windows). */
function loadServiceAccountJsonFile(envPath: string | undefined): {
  client_email: string;
  private_key: string;
} | null {
  if (!envPath?.trim()) return null;
  try {
    const resolved = path.resolve(envPath.trim());
    if (!fs.existsSync(resolved)) return null;
    const raw = fs.readFileSync(resolved, "utf8");
    const o = JSON.parse(raw) as { client_email?: string; private_key?: string };
    return credentialsFromParsedJson(o);
  } catch {
    return null;
  }
}

/**
 * Parses inline JSON from env. Next.js / dotenv on Windows often leaves `\"` and broken PEM newlines;
 * we normalize before JSON.parse.
 */
function parseInlineServiceAccountJson(raw: string): { client_email: string; private_key: string } | null {
  const trimmed = raw.trim();
  const variants = [
    trimmed,
    trimmed.replace(/\\"/g, '"').replace(/\\\r?\n/g, "\\n"),
  ];

  for (const candidate of variants) {
    try {
      const once = JSON.parse(candidate) as unknown;
      if (typeof once === "string") {
        const o = JSON.parse(once) as { client_email?: string; private_key?: string };
        const creds = credentialsFromParsedJson(o);
        if (creds) return creds;
      } else if (once && typeof once === "object") {
        const creds = credentialsFromParsedJson(once as { client_email?: string; private_key?: string });
        if (creds) return creds;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function loadServiceAccountCredentials(): { client_email: string; private_key: string } | null {
  const fromPath =
    loadServiceAccountJsonFile(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH) ??
    loadServiceAccountJsonFile(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (fromPath) return fromPath;

  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const parsed = parseInlineServiceAccountJson(json);
    if (parsed) return parsed;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = parsePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
  if (email && key) {
    return { client_email: email, private_key: key };
  }
  return null;
}

/**
 * Validates service account PEM, folder env, etc. Shared by listing and uploads.
 */
export function getDriveServerContext():
  | { ok: true; ctx: DriveServerContext }
  | { ok: false; error: string } {
  const creds = loadServiceAccountCredentials();
  if (!creds) {
    return {
      ok: false,
      error:
        "Add service account credentials: GOOGLE_SERVICE_ACCOUNT_JSON, or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    };
  }

  if (!isServiceAccountEmail(creds.client_email)) {
    return {
      ok: false,
      error:
        "GOOGLE_SERVICE_ACCOUNT_EMAIL must be the service account ID (ends with .iam.gserviceaccount.com) from the JSON key — not a Gmail address.",
    };
  }

  const folderId = resolveDriveFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID);
  if (!folderId) {
    return {
      ok: false,
      error:
        "Set GOOGLE_DRIVE_FOLDER_ID to the folder ID or full folder URL. Service accounts have no Drive storage: use a Shared drive folder, share a user folder with the service account as Editor, or use user OAuth (GOOGLE_OAUTH_* and /api/google/oauth/start).",
    };
  }

  const key = creds.private_key;
  if (key.includes("...\n") || key.length < 200 || !key.includes("BEGIN PRIVATE KEY")) {
    return {
      ok: false,
      error:
        "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY must be the real key from the downloaded JSON (multi-line PEM), not placeholders like .... Paste the full private_key value with \\n for line breaks.",
    };
  }

  return {
    ok: true,
    ctx: {
      folderId,
      clientEmail: creds.client_email,
      privateKey: creds.private_key,
    },
  };
}

function isOAuthUserDriveConfigured(): boolean {
  return Boolean(
    resolveDriveFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID) &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim() &&
      process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim(),
  );
}

function oauthRedirectUri(): string {
  return getGoogleOAuthRedirectUri();
}

/**
 * Drive client: prefers user OAuth when refresh token + web client are set; otherwise service account JWT.
 */
export async function getDriveApi(
  scopes: readonly string[],
): Promise<{ ok: true; drive: drive_v3.Drive; ctx: DriveServerContext } | { ok: false; error: string }> {
  const folderId = resolveDriveFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID);
  if (!folderId) {
    return {
      ok: false,
      error:
        "Set GOOGLE_DRIVE_FOLDER_ID. For user OAuth, add GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN (see /api/google/oauth/start).",
    };
  }

  if (isOAuthUserDriveConfigured()) {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID!.trim(),
      process.env.GOOGLE_OAUTH_CLIENT_SECRET!.trim(),
      oauthRedirectUri(),
    );
    oauth2.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN!.trim() });
    const drive = google.drive({ version: "v3", auth: oauth2 });
    const ctx: DriveServerContext = {
      folderId,
      clientEmail: "Google user (OAuth)",
      privateKey: "",
    };
    return { ok: true, drive, ctx };
  }

  const base = getDriveServerContext();
  if (!base.ok) return base;
  const drive = google.drive({
    version: "v3",
    auth: new google.auth.GoogleAuth({
      credentials: {
        client_email: base.ctx.clientEmail,
        private_key: base.ctx.privateKey,
      },
      scopes: [...scopes],
    }),
  });
  return { ok: true, drive, ctx: base.ctx };
}

/** True if `itemId` is the linked folder or any descendant under it. */
export async function assertUnderLinkedFolder(
  ctx: DriveServerContext,
  drive: drive_v3.Drive,
  itemId: string,
): Promise<boolean> {
  const root = ctx.folderId;
  let cursor: string | undefined = itemId;
  for (let depth = 0; depth < 64; depth++) {
    if (!cursor) return false;
    if (cursor === root) return true;
    const got = await drive.files.get({
      fileId: cursor,
      fields: "parents,id",
      supportsAllDrives: true,
    });
    const parents: string[] = got.data.parents ?? [];
    if (parents.includes(root)) return true;
    if (parents.length === 0) return false;
    cursor = parents[0];
  }
  return false;
}

function exportMimeForGoogleApp(mime: string): string | null {
  switch (mime) {
    case "application/vnd.google-apps.document":
    case "application/vnd.google-apps.presentation":
    case "application/vnd.google-apps.spreadsheet":
      return "application/pdf";
    case "application/vnd.google-apps.drawing":
      return "image/png";
    default:
      return null;
  }
}

function extensionForMime(mime: string): string {
  if (mime === "application/pdf") return ".pdf";
  if (mime === "image/png") return ".png";
  if (mime === "text/csv") return ".csv";
  return "";
}

/**
 * Confirms item is under linked folder, returns metadata for viewer UI.
 */
export async function getDriveItemMeta(fileId: string): Promise<
  | {
      ok: true;
      name: string;
      mimeType: string;
      size: string | null;
      parents: string[];
      isFolder: boolean;
    }
  | { ok: false; error: string }
> {
  const api = await getDriveApi([SCOPE_READONLY]);
  if (!api.ok) return api;

  const { drive, ctx } = api;

  try {
    const allowed = await assertUnderLinkedFolder(ctx, drive, fileId);
    if (!allowed) return { ok: false, error: "That item is outside the linked Drive folder." };

    const { data } = await drive.files.get({
      fileId,
      fields: "name,mimeType,size,parents",
      supportsAllDrives: true,
    });

    const mimeType = data.mimeType ?? "";
    return {
      ok: true,
      name: data.name ?? "Untitled",
      mimeType,
      size: data.size ?? null,
      parents: data.parents ?? [],
      isFolder: mimeType === "application/vnd.google-apps.folder",
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/** Safe link back from a file or folder to Drive UI (never escapes the linked folder tree). */
export async function resolveDriveBackHrefFromParentId(parentId: string | undefined): Promise<string> {
  const api = await getDriveApi([SCOPE_READONLY]);
  if (!api.ok) return "/drive";
  const { drive, ctx } = api;
  const root = ctx.folderId;
  if (!parentId || parentId === root) return "/drive";
  const ok = await assertUnderLinkedFolder(ctx, drive, parentId);
  if (!ok) return "/drive";
  return `/drive/folder/${encodeURIComponent(parentId)}`;
}

export type DriveStreamResult =
  | {
      ok: true;
      stream: ReadableStreamType;
      mimeType: string;
      filename: string;
    }
  | { ok: false; error: string; status: number };

/** Stream file bytes for proxy / preview (Workspace types exported). */
export async function streamDriveFileContent(fileId: string): Promise<DriveStreamResult> {
  const api = await getDriveApi([SCOPE_READONLY]);
  if (!api.ok) return { ok: false, error: api.error, status: 500 };

  const { drive, ctx } = api;

  try {
    const allowed = await assertUnderLinkedFolder(ctx, drive, fileId);
    if (!allowed) return { ok: false, error: "Not found.", status: 404 };

    const meta = await drive.files.get({
      fileId,
      fields: "name,mimeType",
      supportsAllDrives: true,
    });

    const name = meta.data.name ?? "file";
    const mime = meta.data.mimeType ?? "";

    if (mime === "application/vnd.google-apps.folder") {
      return { ok: false, error: "Folders open in the folder browser.", status: 400 };
    }

    if (mime.startsWith("application/vnd.google-apps.")) {
      const exportMime = exportMimeForGoogleApp(mime);
      if (!exportMime) {
        return {
          ok: false,
          error: "This Google file type cannot be previewed in the app yet. Open it in Google Drive.",
          status: 415,
        };
      }
      const res = await drive.files.export(
        { fileId, mimeType: exportMime },
        { responseType: "stream" },
      );
      const stream = res.data as ReadableStreamType;
      const baseName = name.replace(/\.[^/.]+$/, "");
      return {
        ok: true,
        stream,
        mimeType: exportMime,
        filename: `${baseName}${extensionForMime(exportMime)}`,
      };
    }

    const res = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "stream" },
    );

    return {
      ok: true,
      stream: res.data as ReadableStreamType,
      mimeType: mime || "application/octet-stream",
      filename: name,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg, status: 502 };
  }
}

function sanitizeUploadFileName(raw: string): string {
  const base = raw.replace(/[/\\]/g, "_").replace(/\0/g, "").trim().slice(0, 240);
  return base || "upload.bin";
}

const defaultMaxUploadBytes =
  typeof process.env.DRIVE_UPLOAD_MAX_MB === "string" && /^[1-9]\d*$/.test(process.env.DRIVE_UPLOAD_MAX_MB.trim())
    ? Number(process.env.DRIVE_UPLOAD_MAX_MB.trim()) * 1024 * 1024
    : 50 * 1024 * 1024;

export type UploadToDriveOk = {
  ok: true;
  name: string;
  id: string;
  webViewLink: string | null;
  parentFolderId: string;
  mimeType: string;
};

/**
 * Upload into any folder that sits under the env-linked Drive folder (e.g. project subfolder).
 */
export async function uploadFileToParentFolder(
  parentFolderId: string,
  input: {
    rawName: string;
    mimeType: string | undefined;
    buffer: Buffer;
  },
  options?: { maxBytes?: number }
): Promise<UploadToDriveOk | { ok: false; error: string }> {
  const maxBytes = options?.maxBytes ?? defaultMaxUploadBytes;
  if (input.buffer.length > maxBytes) {
    return {
      ok: false,
      error: `File is larger than allowed (${Math.floor(maxBytes / (1024 * 1024))} MB max). Adjust DRIVE_UPLOAD_MAX_MB.`,
    };
  }

  const api = await getDriveApi([SCOPE_READONLY, SCOPE_READWRITE]);
  if (!api.ok) return api;

  const { drive, ctx } = api;

  const allowed = await assertUnderLinkedFolder(ctx, drive, parentFolderId);
  if (!allowed) {
    return { ok: false, error: "Target folder is outside the linked Drive folder." };
  }

  const name = sanitizeUploadFileName(input.rawName);
  const mimeType =
    typeof input.mimeType === "string" && input.mimeType.trim() ? input.mimeType.trim() : "application/octet-stream";

  try {
    const stream = Readable.from(input.buffer);
    const res = await drive.files.create({
      requestBody: {
        name,
        parents: [parentFolderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: "id,name,webViewLink,mimeType",
      supportsAllDrives: true,
    });

    const id = res.data.id;
    const webViewLink = res.data.webViewLink ?? null;
    if (!id) {
      return { ok: false, error: "Drive did not return a file id after upload." };
    }

    return {
      ok: true,
      name: res.data.name ?? name,
      id,
      webViewLink,
      parentFolderId,
      mimeType: (res.data.mimeType ?? mimeType).trim() || "application/octet-stream",
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isServiceAccountStorageQuotaError(msg)) {
      return { ok: false, error: SERVICE_ACCOUNT_STORAGE_QUOTA_HELP };
    }
    if (/403/i.test(msg) || /Insufficient Permission/i.test(msg)) {
      const low = msg.toLowerCase();
      if (
        /storage|quota|service accounts do not have storage|no drive storage|storagequotaexceeded/.test(low)
      ) {
        return { ok: false, error: SERVICE_ACCOUNT_STORAGE_QUOTA_HELP };
      }
      return {
        ok: false,
        error:
          "Drive rejected the upload (often 403): share folders with the service account as Editor, and ensure the Drive API is enabled.",
      };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Upload one file into the configured Drive folder using the service account.
 * Requires the folder shared with Editor (or Contributor) permission in Drive.
 */
export async function uploadFileToConfiguredFolder(
  input: {
    rawName: string;
    mimeType: string | undefined;
    buffer: Buffer;
  },
  options?: { maxBytes?: number }
): Promise<UploadToDriveOk | { ok: false; error: string }> {
  const folderId = resolveDriveFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID);
  if (!folderId) {
    return { ok: false, error: "Set GOOGLE_DRIVE_FOLDER_ID." };
  }
  if (!isDriveConfigured()) {
    return {
      ok: false,
      error:
        "Drive not configured: add service account credentials or complete OAuth (GOOGLE_OAUTH_*).",
    };
  }
  return uploadFileToParentFolder(folderId, input, options);
}

function safeDriveFolderName(folderName: string): string {
  return folderName.replace(/[/\\]/g, "_").replace(/\0/g, "").trim().slice(0, 240) || "Project folder";
}

const SUBFOLDER_DENIED_HINT =
  "Drive refused to create a subfolder: the service account needs Editor access on that folder (and ancestors). Share the folder with your …@….iam.gserviceaccount.com as Editor, then try again.";

/**
 * Google: service accounts have no personal Drive storage. Writes must target a Shared drive
 * (add the SA as a member) or a user-owned folder shared with the SA (Editor / Content manager),
 * or use user OAuth in this app.
 */
const SERVICE_ACCOUNT_STORAGE_QUOTA_HELP = [
  "Google blocked this: service accounts have no Drive storage of their own.",
  "",
  "Fix one of these:",
  "• This app — User OAuth (uses your Google quota, no Shared drive required): set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env.local, open /api/google/oauth/start in the browser while signed into the account that owns the linked folder, then add GOOGLE_OAUTH_REFRESH_TOKEN from the callback page and restart the dev server.",
  "• Shared drive — Add this service account to the drive as Content manager, put your linked folder there, set GOOGLE_DRIVE_FOLDER_ID to that folder:",
  "  https://developers.google.com/drive/api/guides/about-shareddrives",
  "• User folder — Share a normal My Drive folder with the service account as Editor (uploads use that user’s quota).",
  "• Workspace — Domain-wide delegation so the service account acts as a user:",
  "  https://support.google.com/a/answer/7281227",
].join("\n");

function isServiceAccountStorageQuotaError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /service accounts do not have storage quota/i.test(message) ||
    /do not have storage quota/i.test(message) ||
    /storagequotaexceeded/.test(m) ||
    /storage quota exceeded/i.test(message) ||
    /have no drive storage/i.test(m) ||
    /no drive storage of their own/i.test(m) ||
    /"reason":\s*"storagequotaexceeded"/i.test(message) ||
    /"reason":"storagequotaexceeded"/i.test(m)
  );
}

/**
 * True if `itemId` is the same as `ancestorFolderId` or is a file/folder that lives under that folder tree.
 * Used to ensure picks and moves stay inside a project Drive folder.
 */
export async function assertDescendantOfFolder(
  drive: drive_v3.Drive,
  ancestorFolderId: string,
  itemId: string,
): Promise<boolean> {
  if (itemId === ancestorFolderId) return true;
  const visited = new Set<string>();
  let frontier: string[] = [itemId];
  for (let depth = 0; depth < 64 && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      if (!id || visited.has(id)) continue;
      visited.add(id);
      let parents: string[] = [];
      try {
        const got = await drive.files.get({
          fileId: id,
          fields: "parents",
          supportsAllDrives: true,
        });
        parents = got.data.parents ?? [];
      } catch {
        return false;
      }
      for (const p of parents) {
        if (p === ancestorFolderId) return true;
        next.push(p);
      }
    }
    frontier = next;
  }
  return false;
}

/**
 * Moves a non-folder Drive item into `activityFolderId` (must be under `projectRootFolderId`).
 * Both must sit under the env-linked Drive root (`ctx.folderId`).
 */
export async function moveDriveFileIntoPipelineFolder(
  fileId: string,
  projectRootFolderId: string,
  activityFolderId: string,
): Promise<
  | { ok: true; name: string; webViewLink: string | null; mimeType: string }
  | { ok: false; error: string }
> {
  const api = await getDriveApi([SCOPE_READONLY, SCOPE_READWRITE]);
  if (!api.ok) return api;

  const { drive, ctx } = api;

  const underEnv = async (id: string) => assertUnderLinkedFolder(ctx, drive, id);
  if (!(await underEnv(fileId))) {
    return { ok: false, error: "That file is outside the linked Drive folder." };
  }
  if (!(await underEnv(projectRootFolderId)) || !(await underEnv(activityFolderId))) {
    return { ok: false, error: "Project or activity folder is outside the linked Drive tree." };
  }
  if (!(await assertDescendantOfFolder(drive, projectRootFolderId, fileId))) {
    return { ok: false, error: "Pick a file that is already inside this project’s Drive folder." };
  }
  if (!(await assertDescendantOfFolder(drive, projectRootFolderId, activityFolderId))) {
    return { ok: false, error: "Pipeline folder is not under this project’s Drive folder." };
  }

  try {
    const meta = await drive.files.get({
      fileId,
      fields: "name,mimeType,parents,webViewLink",
      supportsAllDrives: true,
    });
    const mime = meta.data.mimeType ?? "";
    if (mime === "application/vnd.google-apps.folder") {
      return { ok: false, error: "Choose a file, not a folder." };
    }
    const name = meta.data.name ?? "Untitled";
    const webViewLink = meta.data.webViewLink ?? null;
    const parents = meta.data.parents ?? [];
    const fileMime = mime.trim() || "application/octet-stream";
    if (parents.length === 1 && parents[0] === activityFolderId) {
      return { ok: true, name, webViewLink, mimeType: fileMime };
    }

    await drive.files.update({
      fileId,
      addParents: activityFolderId,
      removeParents: parents.join(","),
      fields: "id,name,webViewLink,mimeType",
      supportsAllDrives: true,
    });

    const after = await drive.files.get({
      fileId,
      fields: "name,webViewLink,mimeType",
      supportsAllDrives: true,
    });

    return {
      ok: true,
      name: after.data.name ?? name,
      webViewLink: after.data.webViewLink ?? webViewLink,
      mimeType: (after.data.mimeType ?? fileMime).trim() || "application/octet-stream",
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isServiceAccountStorageQuotaError(msg)) {
      return { ok: false, error: SERVICE_ACCOUNT_STORAGE_QUOTA_HELP };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Create a folder inside `parentFolderId` after verifying the parent is under the linked tree.
 */
export async function createSubfolderUnderLinkedTree(
  parentFolderId: string,
  folderName: string,
): Promise<{ ok: true; folderId: string } | { ok: false; error: string }> {
  const pid = parentFolderId.trim();
  if (!pid) {
    return { ok: false, error: "Choose a parent folder in Drive first." };
  }

  const api = await getDriveApi([SCOPE_READWRITE]);
  if (!api.ok) return api;

  const { drive, ctx } = api;

  const safeName = safeDriveFolderName(folderName);

  try {
    const allowed = await assertUnderLinkedFolder(ctx, drive, pid);
    if (!allowed) {
      return {
        ok: false,
        error: "That folder must be inside the linked Drive folder (GOOGLE_DRIVE_FOLDER_ID).",
      };
    }
    const meta = await drive.files.get({
      fileId: pid,
      fields: "mimeType",
      supportsAllDrives: true,
    });
    if (meta.data.mimeType !== "application/vnd.google-apps.folder") {
      return { ok: false, error: "Parent must be a Drive folder." };
    }

    const res = await drive.files.create({
      requestBody: {
        name: safeName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [pid],
      },
      fields: "id,name",
      supportsAllDrives: true,
    });
    const id = res.data.id;
    if (!id) return { ok: false, error: "Drive did not return a folder id." };
    return { ok: true, folderId: id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isServiceAccountStorageQuotaError(msg)) {
      return { ok: false, error: SERVICE_ACCOUNT_STORAGE_QUOTA_HELP };
    }
    if (
      /Insufficient permissions for the specified parent/i.test(msg) ||
      /Insufficient Permission/i.test(msg) ||
      /\b403\b/.test(msg)
    ) {
      const low = msg.toLowerCase();
      if (
        /storage|quota|service accounts do not have storage|no drive storage|storagequotaexceeded/.test(low)
      ) {
        return { ok: false, error: SERVICE_ACCOUNT_STORAGE_QUOTA_HELP };
      }
      return { ok: false, error: SUBFOLDER_DENIED_HINT };
    }
    return { ok: false, error: msg };
  }
}

/** Create a subfolder inside the env-linked Drive folder (needs Editor on parent). */
export async function createSubfolderInLinkedDrive(
  folderName: string,
): Promise<{ ok: true; folderId: string } | { ok: false; error: string }> {
  const folderId = resolveDriveFolderId(process.env.GOOGLE_DRIVE_FOLDER_ID);
  if (!folderId) {
    return { ok: false, error: "Set GOOGLE_DRIVE_FOLDER_ID." };
  }
  if (!isDriveConfigured()) {
    return {
      ok: false,
      error: "Drive not configured: add service account credentials or complete OAuth (GOOGLE_OAUTH_*).",
    };
  }
  return createSubfolderUnderLinkedTree(folderId, folderName);
}

/** Resolve ID/URL and ensure it is a folder under the linked Drive tree. */
export async function validateDriveFolderForProject(
  folderIdOrUrl: string,
): Promise<{ ok: true; folderId: string } | { ok: false; error: string }> {
  const resolved = resolveDriveFolderId(folderIdOrUrl.trim());
  if (!resolved) {
    return { ok: false, error: "Paste a valid folder ID or Google Drive folder URL." };
  }

  const api = await getDriveApi([SCOPE_READONLY]);
  if (!api.ok) return api;

  const { drive, ctx } = api;

  try {
    const allowed = await assertUnderLinkedFolder(ctx, drive, resolved);
    if (!allowed) {
      return { ok: false, error: "That folder must be inside the linked Drive folder (GOOGLE_DRIVE_FOLDER_ID)." };
    }
    const meta = await drive.files.get({
      fileId: resolved,
      fields: "mimeType",
      supportsAllDrives: true,
    });
    if (meta.data.mimeType !== "application/vnd.google-apps.folder") {
      return { ok: false, error: "That ID is not a folder." };
    }
    return { ok: true, folderId: resolved };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isServiceAccountStorageQuotaError(msg)) {
      return { ok: false, error: SERVICE_ACCOUNT_STORAGE_QUOTA_HELP };
    }
    return { ok: false, error: msg };
  }
}

/**
 * List files and folders directly inside the linked folder or a subfolder.
 * Server-only: call from Server Components or Server Actions.
 */
export async function listDriveFolder(options?: {
  /** Defaults to the linked folder from env. */
  parentFolderId?: string;
}): Promise<
  | {
      ok: true;
      files: DriveFileRow[];
      folderId: string;
      /** The folder whose children are listed (same as query parent). */
      listedFolderId: string;
      serviceAccountEmail: string;
    }
  | { ok: false; error: string }
> {
  const api = await getDriveApi([SCOPE_READONLY]);
  if (!api.ok) return api;

  const { folderId: linkedRootId, clientEmail } = api.ctx;
  const parentFolderId = options?.parentFolderId ?? linkedRootId;

  const { drive, ctx } = api;

  try {
    if (parentFolderId !== linkedRootId) {
      const allowed = await assertUnderLinkedFolder(ctx, drive, parentFolderId);
      if (!allowed) {
        return { ok: false, error: "That folder is outside the linked Drive folder." };
      }
    }

    const res = await drive.files.list({
      q: `'${parentFolderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, modifiedTime, size, webViewLink)",
      pageSize: 100,
      orderBy: "folder,name",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files: DriveFileRow[] = (res.data.files ?? []).map((f) => ({
      id: f.id ?? "",
      name: f.name ?? "",
      mimeType: f.mimeType ?? "",
      modifiedTime: f.modifiedTime ?? null,
      size: f.size ?? null,
      webViewLink: f.webViewLink ?? null,
    }));

    return {
      ok: true,
      files,
      folderId: linkedRootId,
      listedFolderId: parentFolderId,
      serviceAccountEmail: clientEmail,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isServiceAccountStorageQuotaError(msg)) {
      return { ok: false, error: SERVICE_ACCOUNT_STORAGE_QUOTA_HELP };
    }
    return { ok: false, error: msg };
  }
}

export function isDriveConfigured(): boolean {
  return isOAuthUserDriveConfigured() || getDriveServerContext().ok;
}

/**
 * Returns an existing child folder with `desiredName` (after sanitization), or creates it under `parentFolderId`.
 */
export async function ensureChildFolderByName(
  parentFolderId: string,
  desiredName: string,
): Promise<{ ok: true; folderId: string } | { ok: false; error: string }> {
  const safeName = safeDriveFolderName(desiredName);
  const listed = await listDriveFolder({ parentFolderId });
  if (!listed.ok) {
    return { ok: false, error: listed.error };
  }
  const existing = listed.files.find(
    (f) => f.mimeType === "application/vnd.google-apps.folder" && f.name === safeName,
  );
  if (existing?.id) {
    return { ok: true, folderId: existing.id };
  }
  return createSubfolderUnderLinkedTree(parentFolderId, safeName);
}
