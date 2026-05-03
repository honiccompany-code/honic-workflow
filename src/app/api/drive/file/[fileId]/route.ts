import { Readable } from "node:stream";

import { streamDriveFileContent } from "@/lib/google-drive-server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const { fileId: rawId } = await context.params;
  const fileId = decodeURIComponent(rawId);

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
