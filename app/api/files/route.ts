import { NextResponse } from "next/server";

import { getAppSession } from "@/lib/auth";
import {
  contentTypeForFilename,
} from "@/lib/files/document-types";
import {
  isAllowedAttachmentUrl,
  sanitizeDownloadFilename,
} from "@/lib/files/file-preview";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getAppSession();
  if (!session || session.status !== "active") {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url")?.trim() ?? "";
  const filename = sanitizeDownloadFilename(searchParams.get("filename"));
  const download = searchParams.get("download") === "1";

  if (!url || !isAllowedAttachmentUrl(url)) {
    return NextResponse.json({ message: "Invalid file URL" }, { status: 400 });
  }

  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { message: "Unable to load file" },
      { status: upstream.status || 502 },
    );
  }

  const contentType =
    contentTypeForFilename(filename) ??
    upstream.headers.get("content-type")?.split(";")[0]?.trim() ??
    "application/octet-stream";

  const dispositionType = download ? "attachment" : "inline";
  const encoded = encodeURIComponent(filename);

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${dispositionType}; filename="${filename}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, max-age=120",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
