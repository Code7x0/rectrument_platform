/**
 * Abstract file upload — UI never knows storage provider.
 *
 * Current: Airtable Attachments
 * Future: Cloudflare R2 | AWS S3 | Cloudinary
 */

export type UploadProvider = "airtable" | "r2" | "s3" | "cloudinary";

export interface UploadFileInput {
  filename: string;
  contentType: string;
  /** Raw file bytes */
  data: Buffer;
  size: number;
}

/** Result of staging/uploading a file before or after entity create. */
export interface UploadedFile {
  uploadId: string;
  provider: UploadProvider;
  filename: string;
  contentType: string;
  size: number;
  /**
   * Public/download URL when available (R2/S3/Cloudinary).
   * Airtable may be null until bindToEntity completes.
   */
  url: string | null;
}

export interface BindUploadTarget {
  /** Airtable record id (or future object key prefix). */
  entityId: string;
  /** Storage field name — Airtable field or object metadata key. */
  fieldName: string;
}

export interface BoundFile {
  url: string;
  filename: string;
  contentType: string;
  size: number;
  provider: UploadProvider;
}

export interface UploadService {
  /**
   * Stage or store a file. Does not require an entity id.
   * Airtable: holds bytes server-side until bindToEntity.
   * Object storage: uploads immediately and returns URL.
   */
  upload(file: UploadFileInput): Promise<UploadedFile>;

  /**
   * Attach a previously uploaded/staged file to a business record.
   * Required for Airtable Attachments; no-op-ish for pre-uploaded R2/S3.
   */
  bindToEntity(
    upload: UploadedFile,
    target: BindUploadTarget,
  ): Promise<BoundFile>;
}
