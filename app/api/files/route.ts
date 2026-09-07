import { NextResponse } from "next/server";

import { getAppSession } from "@/lib/auth";
import { buildProxiedFilePayload } from "@/lib/files/build-file-response";
import { canAccessAttachmentUrl } from "@/lib/files/authorize-attachment-access";
import {
  isAllowedAttachmentUrl,
  sanitizeDownloadFilename,
} from "@/lib/files/file-preview";

export const runtime = "nodejs";

const MAX_PROXY_BYTES = 12 * 1024 * 1024;

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

  if (!(await canAccessAttachmentUrl(session, url))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok) {
    return NextResponse.json(
      { message: "Unable to load file" },
      { status: upstream.status || 502 },
    );
  }

  const contentLength = Number(upstream.headers.get("content-length") ?? "0");
  if (contentLength > MAX_PROXY_BYTES) {
    return NextResponse.json({ message: "File too large" }, { status: 413 });
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (buffer.byteLength > MAX_PROXY_BYTES) {
    return NextResponse.json({ message: "File too large" }, { status: 413 });
  }

  try {
    const payload = await buildProxiedFilePayload({ buffer, filename, download });
    return new NextResponse(
      typeof payload.body === "string" ? payload.body : new Uint8Array(payload.body),
      {
        status: 200,
        headers: {
          "Content-Type": payload.contentType,
          "Content-Disposition": `${payload.dispositionType}; filename="${payload.downloadName}"; filename*=UTF-8''${encodeURIComponent(payload.downloadName)}`,
          "Cache-Control": "private, max-age=120",
          "X-Content-Type-Options": "nosniff",
          "X-Preview-Kind": payload.kind,
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to preview file",
      },
      { status: 422 },
    );
  }
}
