import { randomUUID } from "crypto";

import { getRequiredEnv } from "@/lib/api/env";
import {
  CANDIDATES_TABLE_FIELDS,
  DOCUMENTS_TABLE_FIELDS,
  JOBS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { resolveAirtableFieldId } from "@/services/uploads/providers/airtable-meta";
import type {
  BindUploadTarget,
  BoundFile,
  UploadFileInput,
  UploadService,
  UploadedFile,
} from "@/services/uploads/types";

/**
 * In-memory staging for Airtable Attachments (pilot).
 * Process-local — fine for single-instance server actions.
 */
const staged = new Map<
  string,
  { data: Buffer; filename: string; contentType: string; size: number }
>();

async function resolveAttachmentFieldId(fieldName: string): Promise<string> {
  if (fieldName === "Partners.Resume") {
    return resolveAirtableFieldId("partnersTable", "Resume");
  }

  if (
    fieldName === CANDIDATES_TABLE_FIELDS.resume ||
    fieldName === "Resume"
  ) {
    return resolveAirtableFieldId(
      "candidatesTable",
      CANDIDATES_TABLE_FIELDS.resume,
    );
  }

  if (fieldName === DOCUMENTS_TABLE_FIELDS.file || fieldName === "File") {
    return resolveAirtableFieldId(
      "documentsTable",
      DOCUMENTS_TABLE_FIELDS.file,
    );
  }

  if (
    fieldName === JOBS_TABLE_FIELDS.description ||
    fieldName === "Job Description"
  ) {
    return resolveAirtableFieldId(
      "jobsTable",
      JOBS_TABLE_FIELDS.description,
    );
  }

  if (
    fieldName === JOBS_TABLE_FIELDS.sampleProfiling ||
    fieldName === "Sample Profiling"
  ) {
    return resolveAirtableFieldId(
      "jobsTable",
      JOBS_TABLE_FIELDS.sampleProfiling,
    );
  }

  return fieldName;
}

/**
 * Airtable Attachments provider.
 * Stages bytes on upload(), then posts to Airtable Content API on bindToEntity().
 */
export class AirtableAttachmentUploadService implements UploadService {
  async upload(file: UploadFileInput): Promise<UploadedFile> {
    const uploadId = randomUUID();
    staged.set(uploadId, {
      data: file.data,
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
    });

    return {
      uploadId,
      provider: "airtable",
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
      url: null,
      data: file.data,
    };
  }

  async bindToEntity(
    upload: UploadedFile,
    target: BindUploadTarget,
  ): Promise<BoundFile> {
    const stagedPayload = staged.get(upload.uploadId);
    const payload = stagedPayload
      ? stagedPayload
      : upload.data
        ? {
            data: upload.data,
            filename: upload.filename,
            contentType: upload.contentType,
            size: upload.size,
          }
        : null;

    if (!payload) {
      throw new Error(
        "Upload expired or not found — please re-select the file",
      );
    }

    // Allow callers to override the stored filename (typed doc prefixes).
    const filename = upload.filename || payload.filename;

    // Replace (not append): Airtable Content API adds attachments; clear first.
    await this.clearEntityAttachment(target);

    const apiKey = getRequiredEnv("AIRTABLE_API_KEY");
    const baseId = getRequiredEnv("AIRTABLE_BASE_ID");
    const fieldId = await resolveAttachmentFieldId(target.fieldName);

    const response = await fetch(
      `https://content.airtable.com/v0/${baseId}/${target.entityId}/${fieldId}/uploadAttachment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentType: payload.contentType,
          file: payload.data.toString("base64"),
          filename,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Failed to attach file (${response.status}): ${text.slice(0, 200)}`,
      );
    }

    const json = (await response.json()) as {
      url?: string;
      filename?: string;
    };

    staged.delete(upload.uploadId);

    return {
      url: json.url ?? "",
      filename: json.filename ?? filename,
      contentType: upload.contentType,
      size: upload.size,
      provider: "airtable",
    };
  }

  async clearEntityAttachment(target: BindUploadTarget): Promise<void> {
    const { updateRecord } = await import("@/lib/airtable/client");
    const { getAirtableTableName } = await import("@/lib/airtable/tables");

    let tableName: string;
    if (
      target.fieldName === CANDIDATES_TABLE_FIELDS.resume ||
      target.fieldName === "Resume"
    ) {
      tableName = getAirtableTableName("candidatesTable");
    } else if (
      target.fieldName === DOCUMENTS_TABLE_FIELDS.file ||
      target.fieldName === "File"
    ) {
      tableName = getAirtableTableName("documentsTable");
    } else if (
      target.fieldName === JOBS_TABLE_FIELDS.description ||
      target.fieldName === "Job Description" ||
      target.fieldName === JOBS_TABLE_FIELDS.sampleProfiling ||
      target.fieldName === "Sample Profiling"
    ) {
      tableName = getAirtableTableName("jobsTable");
    } else if (target.fieldName === "Partners.Resume") {
      tableName = getAirtableTableName("partnersTable");
    } else {
      tableName = getAirtableTableName("candidatesTable");
    }

    const fieldName =
      target.fieldName === "Partners.Resume" ? "Resume" : target.fieldName;

    await updateRecord(tableName, target.entityId, {
      [fieldName]: [],
    });
  }
}
