import { contentTypeForFilename } from "@/lib/files/document-types";
import { convertDocToHtml, convertDocxToHtml } from "@/lib/files/convert-word";
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

function binaryPayload(
  buffer: Buffer,
  kind: SniffedFileKind,
  filename: string,
  download: boolean,
): ProxiedFilePayload {
  const binaryType =
    contentTypeForKind(kind) ??
    contentTypeForFilename(filename) ??
    "application/octet-stream";
  const ext = extensionForKind(kind);
  const downloadName =
    filename.includes(".") || !ext ? filename : `${filename}.${ext}`;

  return {
    body: buffer,
    contentType: binaryType,
    kind,
    downloadName,
    dispositionType: download ? "attachment" : "inline",
  };
}

export async function buildProxiedFilePayload(input: {
  buffer: Buffer;
  filename: string;
  download: boolean;
}): Promise<ProxiedFilePayload> {
  const kind = sniffFileKind(new Uint8Array(input.buffer));
  const binary = binaryPayload(input.buffer, kind, input.filename, input.download);

  if (input.download) {
    return binary;
  }

  if (kind === "docx" || kind === "unknown") {
    const html = await convertDocxToHtml(input.buffer);
    if (html) {
      return {
        ...binary,
        body: html,
        contentType: "text/html; charset=utf-8",
        kind: kind === "unknown" ? "docx" : kind,
        dispositionType: "inline",
      };
    }
  }

  if (kind === "doc" || kind === "unknown") {
    const html = await convertDocToHtml(input.buffer);
    if (html) {
      return {
        ...binary,
        body: html,
        contentType: "text/html; charset=utf-8",
        kind: kind === "unknown" ? "doc" : kind,
        dispositionType: "inline",
      };
    }
  }

  return binary;
}
