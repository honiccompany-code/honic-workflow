import { Readable } from "node:stream";

import { assertShareFileInProjectFolder, resolveShareTokenToProjectId } from "@/lib/project-share";
import { loadProjectDetail } from "@/lib/projects-data";
import { streamDriveFileContent } from "@/lib/google-drive-server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string; fileId: string }> },
) {
  const { token, fileId: rawId } = await context.params;
  const fileId = decodeURIComponent(rawId);

  const resolved = await resolveShareTokenToProjectId(token);
  if (!resolved.ok) {
    return new Response(resolved.error, { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const { project } = await loadProjectDetail(resolved.projectId);
  const folderId = project?.google_drive_folder_id;
  if (!folderId) {
    return new Response("This project has no linked Drive folder.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const allowed = await assertShareFileInProjectFolder(folderId, fileId);
  if (!allowed) {
    return new Response("Not found.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const url = new URL(request.url);
  const asAttachment =
    url.searchParams.get("download") === "1" || url.searchParams.get("disposition") === "attachment";

  const result = await streamDriveFileContent(fileId);
  if (!result.ok) {
    return new Response(result.error, {
      status: result.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const webStream = Readable.toWeb(result.stream as Readable);
  const safeName = result.filename.replace(/[\r\n"]/g, "_");
  const disposition = asAttachment ? "attachment" : "inline";

  return new Response(webStream as unknown as BodyInit, {
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
