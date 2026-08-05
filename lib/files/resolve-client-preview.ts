import {
  isImageKind,
  sniffFileKind,
  type SniffedFileKind,
} from "@/lib/files/sniff-file";

export type ClientPreview =
  | { status: "pdf"; bytes: Uint8Array }
  | { status: "image"; bytes: Uint8Array; contentType: string }
  | { status: "html"; html: string }
  | { status: "error"; message: string };

export function headerPreviewKind(value: string | null): SniffedFileKind | null {
  if (
    value === "pdf" ||
    value === "png" ||
    value === "jpeg" ||
    value === "gif" ||
    value === "webp" ||
    value === "docx" ||
    value === "doc" ||
    value === "unknown"
  ) {
    return value;
  }
  return null;
}

export function resolveClientPreview(input: {
  headerKind?: SniffedFileKind | null;
  contentType: string;
  bytes: Uint8Array;
}): ClientPreview {
  const contentType = input.contentType.split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
  const sniffed = sniffFileKind(input.bytes);
  const kind =
    input.headerKind && input.headerKind !== "unknown"
      ? input.headerKind
      : sniffed;

  if (contentType === "text/html" || contentType.startsWith("text/plain")) {
    const text = new TextDecoder("utf-8").decode(input.bytes).trim();
    if (!text) {
      return {
        status: "error",
        message: "This document does not contain previewable text.",
      };
    }
    if (contentType === "text/html") {
      return { status: "html", html: text };
    }
    return {
      status: "html",
      html: text
        .split(/\r?\n/)
        .map((line) => `<p>${line || "&nbsp;"}</p>`)
        .join(""),
    };
  }

  if (kind === "pdf" || contentType === "application/pdf") {
    return { status: "pdf", bytes: input.bytes };
  }

  if (isImageKind(kind) || contentType.startsWith("image/")) {
    return {
      status: "image",
      bytes: input.bytes,
      contentType: contentType.startsWith("image/")
        ? contentType
        : kind === "png"
          ? "image/png"
          : kind === "gif"
            ? "image/gif"
            : kind === "webp"
              ? "image/webp"
              : "image/jpeg",
    };
  }

  if (kind === "unknown") {
    return { status: "pdf", bytes: input.bytes };
  }

  if (kind === "doc" || kind === "docx") {
    return {
      status: "error",
      message: "Unable to preview this Word document. Download the file to open it.",
    };
  }

  return {
    status: "error",
    message: "This file type can’t be previewed in the browser.",
  };
}
