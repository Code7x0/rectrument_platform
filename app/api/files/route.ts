import { NextResponse } from "next/server";

import { getAppSession } from "@/lib/auth";
import { contentTypeForFilename } from "@/lib/files/document-types";
import {
  isAllowedAttachmentUrl,
  sanitizeDownloadFilename,
} from "@/lib/files/file-preview";
import { contentTypeForKind, sniffFileKind } from "@/lib/files/sniff-file";

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
  if (!upstream.ok) {
    return NextResponse.json(
      { message: "Unable to load file" },
      { status: upstream.status || 502 },
    );
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  const kind = sniffFileKind(new Uint8Array(buffer));
  const contentType =
    contentTypeForFilename(filename) ??
    contentTypeForKind(kind) ??
    upstream.headers.get("content-type")?.split(";")[0]?.trim() ??
    "application/octet-stream";

  const dispositionType = download ? "attachment" : "inline";
  const downloadName =
    filename.includes(".") || kind === "unknown"
      ? filename
      : `${filename}.${kind === "jpeg" ? "jpg" : kind === "docx" ? "docx" : kind === "doc" ? "doc" : kind === "pdf" ? "pdf" : kind === "png" ? "png" : kind === "gif" ? "gif" : kind === "webp" ? "webp" : "bin"}`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${dispositionType}; filename="${downloadName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      "Cache-Control": "private, max-age=120",
      "X-Content-Type-Options": "nosniff",
      "X-Preview-Kind": kind,
    },
  });
}
