/**
 * Shared upload validation / MIME normalization for resumes & partner docs.
 * Browsers disagree on Word MIME types (often zip / empty / octet-stream).
 * Prefer extension; always send a canonical content-type to Airtable.
 */

export const RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

export const DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".doc",
  ".docx",
] as const;

const EXT_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

/** MIME aliases browsers may report for allowed files. */
const MIME_ALIASES: Record<string, string> = {
  "application/pdf": "application/pdf",
  "application/x-pdf": "application/pdf",
  "application/msword": "application/msword",
  "application/vnd.ms-word": "application/msword",
  "application/doc": "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // .docx is a zip — Chromium/LibreOffice often report these
  "application/zip":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/x-zip-compressed":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream": "application/octet-stream",
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
};

function extensionOf(filename: string): string | null {
  const lower = filename.trim().toLowerCase();
  // Prefer longer matches (.docx before .doc)
  const known = Object.keys(EXT_TO_MIME).sort((a, b) => b.length - a.length);
  for (const ext of known) {
    if (lower.endsWith(ext)) {
      return ext;
    }
  }
  return null;
}

export function hasAllowedExtension(
  filename: string,
  allowed: readonly string[],
): boolean {
  const lower = filename.trim().toLowerCase();
  return [...allowed]
    .sort((a, b) => b.length - a.length)
    .some((ext) => lower.endsWith(ext.toLowerCase()));
}

/**
 * Canonical MIME for Airtable uploads. Extension wins when present.
 */
export function normalizeUploadContentType(
  filename: string,
  reportedType: string | null | undefined,
): string {
  const ext = extensionOf(filename);
  if (ext && EXT_TO_MIME[ext]) {
    return EXT_TO_MIME[ext]!;
  }

  const raw = (reportedType ?? "").trim().toLowerCase().split(";")[0]?.trim();
  if (raw && MIME_ALIASES[raw]) {
    return MIME_ALIASES[raw]!;
  }

  return "application/octet-stream";
}

export function isAllowedUploadMime(
  reportedType: string | null | undefined,
): boolean {
  const raw = (reportedType ?? "").trim().toLowerCase().split(";")[0]?.trim();
  if (!raw) {
    return true; // empty type — rely on extension
  }
  return Boolean(MIME_ALIASES[raw]);
}

export function validateResumeFileMeta(input: {
  filename: string;
  contentType?: string | null;
  size: number;
  maxBytes?: number;
}): string | null {
  const max = input.maxBytes ?? 8 * 1024 * 1024;
  if (input.size <= 0) {
    return "Resume is required";
  }
  if (input.size > max) {
    return "Resume must be 8MB or smaller";
  }

  const hasExt = hasAllowedExtension(input.filename, RESUME_EXTENSIONS);
  if (!hasExt) {
    return "Resume must be a PDF or Word document (.pdf, .doc, .docx)";
  }

  // Extension is authoritative; only reject clearly wrong non-empty MIME families
  // (e.g. video/*) when present.
  const raw = (input.contentType ?? "").trim().toLowerCase().split(";")[0]?.trim();
  if (raw && !isAllowedUploadMime(raw) && !raw.startsWith("application/")) {
    return "Resume must be a PDF or Word document (.pdf, .doc, .docx)";
  }

  return null;
}

export const RESUME_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
