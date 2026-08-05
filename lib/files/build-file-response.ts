import { contentTypeForFilename } from "@/lib/files/document-types";
import {
  contentTypeForKind,
  extensionForKind,
  sniffFileKind,
  type SniffedFileKind,
} from "@/lib/files/sniff-file";

export interface ProxiedFilePayload {
  body: Buffer | string;
  contentType: string;
  kind: SniffedFileKind;
  downloadName: string;
  dispositionType: "inline" | "attachment";
}

export async function buildProxiedFilePayload(input: {
  buffer: Buffer;
  filename: string;
  download: boolean;
}): Promise<ProxiedFilePayload> {
  const kind = sniffFileKind(new Uint8Array(input.buffer));
  const binaryType =
    contentTypeForKind(kind) ??
    contentTypeForFilename(input.filename) ??
    "application/octet-stream";
  const ext = extensionForKind(kind);
  const downloadName =
    input.filename.includes(".") || !ext ? input.filename : `${input.filename}.${ext}`;

  if (!input.download && kind === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ buffer: input.buffer });
    if (!result.value?.trim()) {
      throw new Error("Unable to preview Word document");
    }
    return {
      body: result.value,
      contentType: "text/html; charset=utf-8",
      kind,
      downloadName,
      dispositionType: "inline",
    };
  }

  return {
    body: input.buffer,
    contentType: binaryType,
    kind,
    downloadName,
    dispositionType: input.download ? "attachment" : "inline",
  };
}
