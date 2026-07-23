import type { AirtableFields } from "@/lib/airtable/client";
import {
  AIRTABLE_DOCUMENT_RECORD_STATUS,
  AIRTABLE_DOCUMENT_TYPE,
  AIRTABLE_DOCUMENT_VERIFICATION,
  DOCUMENTS_TABLE_FIELDS,
  DOMAIN_DOCUMENT_RECORD_STATUS_TO_AIRTABLE,
  DOMAIN_DOCUMENT_TYPE_TO_AIRTABLE,
  DOMAIN_DOCUMENT_VERIFICATION_TO_AIRTABLE,
} from "@/lib/airtable/fields";
import type {
  CreatePartnerDocumentInput,
  DocumentRecordStatus,
  DocumentVerificationStatus,
  PartnerDocument,
  PartnerDocumentType,
  UpdatePartnerDocumentInput,
} from "@/features/partner-documents/types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asLinkedId(value: unknown): string | null {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

function asAttachment(value: unknown): {
  url: string | null;
  filename: string | null;
} {
  if (!Array.isArray(value) || value.length === 0) {
    return { url: null, filename: null };
  }
  const first = value[0] as { url?: string; filename?: string };
  return {
    url: typeof first.url === "string" ? first.url : null,
    filename: typeof first.filename === "string" ? first.filename : null,
  };
}

function mapDocumentType(value: unknown): PartnerDocumentType {
  const raw = asString(value);
  if (!raw) {
    return "pan";
  }
  return (
    AIRTABLE_DOCUMENT_TYPE[raw as keyof typeof AIRTABLE_DOCUMENT_TYPE] ?? "pan"
  );
}

function mapVerification(value: unknown): DocumentVerificationStatus {
  const raw = asString(value);
  if (!raw) {
    return "pending";
  }
  return (
    AIRTABLE_DOCUMENT_VERIFICATION[
      raw as keyof typeof AIRTABLE_DOCUMENT_VERIFICATION
    ] ?? "pending"
  );
}

function mapRecordStatus(value: unknown): DocumentRecordStatus {
  const raw = asString(value);
  if (!raw) {
    return "active";
  }
  return (
    AIRTABLE_DOCUMENT_RECORD_STATUS[
      raw as keyof typeof AIRTABLE_DOCUMENT_RECORD_STATUS
    ] ?? "active"
  );
}

export function mapPartnerDocumentRecord(record: {
  id: string;
  fields: AirtableFields;
}): PartnerDocument {
  const fields = record.fields;
  const partnerId = asLinkedId(fields[DOCUMENTS_TABLE_FIELDS.partner]);
  if (!partnerId) {
    throw new Error(`Document ${record.id} is missing Partner`);
  }

  const file = asAttachment(fields[DOCUMENTS_TABLE_FIELDS.file]);

  return {
    id: record.id,
    documentCode:
      asString(fields[DOCUMENTS_TABLE_FIELDS.documentId]) ??
      record.id.replace(/^rec/, "DOC-"),
    partnerId,
    partnerName: null,
    documentType: mapDocumentType(fields[DOCUMENTS_TABLE_FIELDS.documentType]),
    fileUrl: file.url,
    fileName: file.filename,
    uploadedAt: asString(fields[DOCUMENTS_TABLE_FIELDS.uploadedAt]),
    verificationStatus: mapVerification(
      fields[DOCUMENTS_TABLE_FIELDS.verificationStatus],
    ),
    verifiedById: asLinkedId(fields[DOCUMENTS_TABLE_FIELDS.verifiedBy]),
    verifiedByName: null,
    verifiedAt: asString(fields[DOCUMENTS_TABLE_FIELDS.verifiedAt]),
    rejectionReason: asString(fields[DOCUMENTS_TABLE_FIELDS.rejectionReason]),
    notes: asString(fields[DOCUMENTS_TABLE_FIELDS.notes]),
    status: mapRecordStatus(fields[DOCUMENTS_TABLE_FIELDS.status]),
  };
}

export function toAirtableCreateFields(
  input: CreatePartnerDocumentInput,
): AirtableFields {
  const fields: AirtableFields = {
    [DOCUMENTS_TABLE_FIELDS.partner]: [input.partnerId],
    [DOCUMENTS_TABLE_FIELDS.documentType]:
      DOMAIN_DOCUMENT_TYPE_TO_AIRTABLE[input.documentType],
    [DOCUMENTS_TABLE_FIELDS.verificationStatus]:
      DOMAIN_DOCUMENT_VERIFICATION_TO_AIRTABLE[
        input.verificationStatus ?? "pending"
      ],
    [DOCUMENTS_TABLE_FIELDS.status]:
      DOMAIN_DOCUMENT_RECORD_STATUS_TO_AIRTABLE[input.status ?? "active"],
    [DOCUMENTS_TABLE_FIELDS.uploadedAt]:
      input.uploadedAt ?? new Date().toISOString(),
  };

  if (input.notes) {
    fields[DOCUMENTS_TABLE_FIELDS.notes] = input.notes;
  }

  return fields;
}

export function toAirtableUpdateFields(
  input: UpdatePartnerDocumentInput,
): AirtableFields {
  const fields: AirtableFields = {};

  if (input.verificationStatus !== undefined) {
    fields[DOCUMENTS_TABLE_FIELDS.verificationStatus] =
      DOMAIN_DOCUMENT_VERIFICATION_TO_AIRTABLE[input.verificationStatus];
  }
  if (input.verifiedById !== undefined) {
    fields[DOCUMENTS_TABLE_FIELDS.verifiedBy] = input.verifiedById
      ? [input.verifiedById]
      : [];
  }
  if (input.verifiedAt !== undefined) {
    fields[DOCUMENTS_TABLE_FIELDS.verifiedAt] = input.verifiedAt ?? "";
  }
  if (input.rejectionReason !== undefined) {
    fields[DOCUMENTS_TABLE_FIELDS.rejectionReason] =
      input.rejectionReason ?? "";
  }
  if (input.notes !== undefined) {
    fields[DOCUMENTS_TABLE_FIELDS.notes] = input.notes ?? "";
  }
  if (input.status !== undefined) {
    fields[DOCUMENTS_TABLE_FIELDS.status] =
      DOMAIN_DOCUMENT_RECORD_STATUS_TO_AIRTABLE[input.status];
  }
  if (input.uploadedAt !== undefined) {
    fields[DOCUMENTS_TABLE_FIELDS.uploadedAt] = input.uploadedAt ?? "";
  }

  return fields;
}

export function buildDocumentsFilterFormula(input: {
  partnerId?: string;
  documentType?: PartnerDocumentType;
  verificationStatus?: DocumentVerificationStatus;
  includeArchived?: boolean;
}): string | undefined {
  const clauses: string[] = [];

  if (!input.includeArchived) {
    clauses.push(
      `{${DOCUMENTS_TABLE_FIELDS.status}} = '${DOMAIN_DOCUMENT_RECORD_STATUS_TO_AIRTABLE.active}'`,
    );
  }

  if (input.partnerId) {
    clauses.push(
      `FIND('${input.partnerId}', ARRAYJOIN({${DOCUMENTS_TABLE_FIELDS.partner}}))`,
    );
  }

  if (input.documentType) {
    clauses.push(
      `{${DOCUMENTS_TABLE_FIELDS.documentType}} = '${DOMAIN_DOCUMENT_TYPE_TO_AIRTABLE[input.documentType]}'`,
    );
  }

  if (input.verificationStatus) {
    clauses.push(
      `{${DOCUMENTS_TABLE_FIELDS.verificationStatus}} = '${DOMAIN_DOCUMENT_VERIFICATION_TO_AIRTABLE[input.verificationStatus]}'`,
    );
  }

  if (clauses.length === 0) {
    return undefined;
  }
  if (clauses.length === 1) {
    return clauses[0];
  }
  return `AND(${clauses.join(", ")})`;
}
