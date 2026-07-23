import { AirtableAttachmentUploadService } from "@/services/uploads/providers/airtable-attachments.provider";
import type { UploadService } from "@/services/uploads/types";

/**
 * Resolve the configured upload provider.
 * Swap implementation here when migrating to R2 / S3 / Cloudinary.
 */
export function getUploadService(): UploadService {
  const provider = process.env.UPLOAD_PROVIDER ?? "airtable";

  switch (provider) {
    case "airtable":
      return new AirtableAttachmentUploadService();
    default:
      // Future: R2UploadService, S3UploadService, CloudinaryUploadService
      return new AirtableAttachmentUploadService();
  }
}

export type {
  BindUploadTarget,
  BoundFile,
  UploadFileInput,
  UploadService,
  UploadedFile,
} from "@/services/uploads/types";
