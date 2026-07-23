import { z } from "zod";

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
] as const;

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".doc",
  ".docx",
] as const;

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

  const lower = input.filename.toLowerCase();
  const hasExt = ALLOWED_DOCUMENT_EXTENSIONS.some((ext) =>
    lower.endsWith(ext),
  );
  const hasMime = (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(
    input.contentType,
  );

  if (!hasExt && !hasMime) {
    return "Allowed types: PDF, PNG, JPEG, DOC, DOCX";
  }

  return null;
}
