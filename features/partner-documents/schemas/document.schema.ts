import { z } from "zod";

import {
  DOCUMENT_EXTENSIONS,
  hasAllowedExtension,
  isAllowedUploadMime,
  normalizeUploadContentType,
} from "@/lib/files/document-types";

export const documentTypeSchema = z.enum(["pan", "aadhaar", "agreement"]);

export const documentVerificationSchema = z.enum([
  "pending",
  "verified",
  "rejected",
]);

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
] as const;

export const ALLOWED_DOCUMENT_EXTENSIONS = DOCUMENT_EXTENSIONS;

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const rejectDocumentSchema = z.object({
  documentId: z.string().min(1),
  rejectionReason: z
    .string()
    .trim()
    .min(3, "Provide a short rejection reason"),
});

export type RejectDocumentValues = z.infer<typeof rejectDocumentSchema>;

export function validateDocumentFileMeta(input: {
  filename: string;
  contentType: string;
  size: number;
}): string | null {
  if (input.size <= 0) {
    return "File is required";
  }
  if (input.size > MAX_DOCUMENT_SIZE_BYTES) {
    return "File must be 10 MB or smaller";
  }

  const hasExt = hasAllowedExtension(input.filename, ALLOWED_DOCUMENT_EXTENSIONS);
  const hasMime = isAllowedUploadMime(input.contentType);

  // Extension is enough; MIME alone is enough for images without extension edge cases.
  if (!hasExt && !hasMime) {
    return "Allowed types: PDF, PNG, JPEG, DOC, DOCX";
  }

  // Reject when extension says Word/PDF/image but MIME is clearly unrelated media.
  if (hasExt) {
    const raw = (input.contentType ?? "").trim().toLowerCase().split(";")[0]?.trim();
    if (
      raw &&
      !isAllowedUploadMime(raw) &&
      (raw.startsWith("video/") ||
        raw.startsWith("audio/") ||
        raw.startsWith("text/html"))
    ) {
      return "Allowed types: PDF, PNG, JPEG, DOC, DOCX";
    }
  }

  return null;
}

export { normalizeUploadContentType };
