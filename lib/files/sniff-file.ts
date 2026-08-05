export type SniffedFileKind =
  | "pdf"
  | "png"
  | "jpeg"
  | "gif"
  | "webp"
  | "docx"
  | "doc"
  | "unknown";

function bytesContainAscii(bytes: Uint8Array, ascii: string): boolean {
  const needle = new TextEncoder().encode(ascii);
  if (needle.length === 0 || bytes.length < needle.length) {
    return false;
  }
  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) {
        continue outer;
      }
    }
    return true;
  }
  return false;
}

export function sniffFileKind(bytes: Uint8Array): SniffedFileKind {
  const searchLimit = Math.min(bytes.length - 4, 1024);
  for (let i = 0; i <= searchLimit; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46
    ) {
      return "pdf";
    }
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    if (
      bytesContainAscii(bytes, "word/document.xml") ||
      bytesContainAscii(bytes, "word/document2.xml")
    ) {
      return "docx";
    }
    return "unknown";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  ) {
    return "doc";
  }
  return "unknown";
}

export function contentTypeForKind(kind: SniffedFileKind): string | null {
  switch (kind) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    default:
      return null;
  }
}

export function extensionForKind(kind: SniffedFileKind): string | null {
  switch (kind) {
    case "jpeg":
      return "jpg";
    case "unknown":
      return null;
    default:
      return kind;
  }
}

export function isImageKind(kind: SniffedFileKind): boolean {
  return kind === "png" || kind === "jpeg" || kind === "gif" || kind === "webp";
}
