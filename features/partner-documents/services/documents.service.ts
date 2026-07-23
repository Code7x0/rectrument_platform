import { findRecord, type AirtableFields } from "@/lib/airtable/client";
import { upsertDocMarker } from "@/lib/airtable/field-markers";
import { asString } from "@/lib/airtable/compat";
import {
  DOCUMENTS_TABLE_FIELDS,
  PARTNERS_TABLE_FIELDS,
  USERS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import {
  getAirtableTableName,
  getOptionalAirtableTableName,
} from "@/lib/airtable/tables";
import { listPartnerOptions } from "@/services/lookups";
import { getUploadService, type UploadedFile } from "@/services/uploads";
import {
  findPartnerById,
  patchPartner,
} from "@/features/partners/repositories/partners.repository";
import { toAirtableUpdateFields as toPartnerUpdateFields } from "@/features/partners/services/partners.mapper";
import {
  findDocumentById,
  findDocuments,
  insertDocument,
  patchDocument,
} from "@/features/partner-documents/repositories/documents.repository";
import {
  buildDocumentsFilterFormula,
  toAirtableCreateFields,
  toAirtableUpdateFields,
} from "@/features/partner-documents/services/documents.mapper";
import {
  deriveDocumentsFromPartnerResumes,
} from "@/features/partner-documents/services/documents.derived";
import type {
  DocumentVerificationStatus,
  PartnerDocument,
  PartnerDocumentListFilters,
  PartnerDocumentSummary,
  PartnerDocumentType,
} from "@/features/partner-documents/types";
import {
  REQUIRED_DOCUMENT_TYPES,
} from "@/features/partner-documents/types";
import {
  buildDocumentSlots,
  summarizeDocuments,
} from "@/features/partner-documents/lib/document-slots";
import type { PartnerVerificationStatus } from "@/features/shared/entities";
import { recordActivity } from "@/features/workflows/services/activity.service";

export { buildDocumentSlots, summarizeDocuments } from "@/features/partner-documents/lib/document-slots";

function typedDocumentFilename(
  documentType: PartnerDocumentType,
  filename: string,
): string {
  const lower = filename.toLowerCase();
  if (lower.includes(documentType)) {
    return filename;
  }
  return `${documentType}_${filename}`;
}

/**
 * Locked client base: store KYC/docs on Partners.Resume with typed filenames
 * and verification markers in Performance Notes.
 */
async function uploadPartnerDocumentToResume(input: {
  partnerId: string;
  documentType: PartnerDocumentType;
  upload: UploadedFile;
}): Promise<PartnerDocument> {
  const filename = typedDocumentFilename(
    input.documentType,
    input.upload.filename,
  );
  const uploader = getUploadService();
  await uploader.bindToEntity(
    { ...input.upload, filename },
    {
      entityId: input.partnerId,
      fieldName: "Partners.Resume",
    },
  );

  const partnersTable = getAirtableTableName("partnersTable");
  const partner = await findRecord(partnersTable, input.partnerId);
  const existingNotes = asString(
    partner.fields[PARTNERS_TABLE_FIELDS.notes],
  );
  const nextNotes = upsertDocMarker(existingNotes, {
    filename,
    status: "pending",
    reason: null,
    at: new Date().toISOString(),
  });
  await patchPartner(input.partnerId, toPartnerUpdateFields({ notes: nextNotes }));

  const docs = await deriveDocumentsFromPartnerResumes();
  const attached =
    docs.find(
      (doc) =>
        doc.partnerId === input.partnerId &&
        doc.documentType === input.documentType &&
        doc.fileName?.toLowerCase().includes(input.documentType),
    ) ??
    docs
      .filter((doc) => doc.partnerId === input.partnerId)
      .at(-1);

  if (!attached) {
    throw new Error("Document uploaded but could not be resolved from Resume");
  }

  return attached;
}

async function resolveUserName(userId: string): Promise<string | null> {
  try {
    const record = await findRecord(
      getAirtableTableName("usersTable"),
      userId,
    );
    const fields = record.fields as AirtableFields;
    const name = fields[USERS_TABLE_FIELDS.fullName];
    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}

async function withEnrichment(
  documents: PartnerDocument[],
): Promise<PartnerDocument[]> {
  if (documents.length === 0) {
    return documents;
  }

  const partners = await listPartnerOptions();
  const partnerMap = new Map(partners.map((p) => [p.id, p.label]));

  const verifierIds = [
    ...new Set(
      documents
        .map((doc) => doc.verifiedById)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const verifierEntries = await Promise.all(
    verifierIds.map(async (id) => [id, await resolveUserName(id)] as const),
  );
  const verifierMap = new Map(verifierEntries);

  return documents.map((doc) => ({
    ...doc,
    partnerName: partnerMap.get(doc.partnerId) ?? null,
    verifiedByName: doc.verifiedById
      ? (verifierMap.get(doc.verifiedById) ?? null)
      : null,
  }));
}

export async function listDocuments(
  filters: PartnerDocumentListFilters = {},
): Promise<PartnerDocument[]> {
  const formula = buildDocumentsFilterFormula(filters);
  const rows = await findDocuments({
    ...(formula ? { filterByFormula: formula } : {}),
    sort: [{ field: DOCUMENTS_TABLE_FIELDS.uploadedAt, direction: "desc" }],
  });
  return withEnrichment(rows);
}

export async function getDocumentById(
  documentId: string,
): Promise<PartnerDocument | null> {
  const row = await findDocumentById(documentId);
  if (!row) {
    return null;
  }
  const [enriched] = await withEnrichment([row]);
  return enriched ?? null;
}

export async function listDocumentsForPartner(
  partnerId: string,
): Promise<PartnerDocument[]> {
  return listDocuments({ partnerId });
}

export async function getPartnerDocumentSummary(
  partnerId: string,
): Promise<PartnerDocumentSummary> {
  const documents = await listDocumentsForPartner(partnerId);
  return summarizeDocuments(documents);
}

async function attachFileToDocument(
  documentId: string,
  upload: UploadedFile,
): Promise<PartnerDocument> {
  const uploader = getUploadService();
  await uploader.bindToEntity(upload, {
    entityId: documentId,
    fieldName: DOCUMENTS_TABLE_FIELDS.file,
  });

  const refreshed = await getDocumentById(documentId);
  if (!refreshed) {
    throw new Error("Document not found after file upload");
  }
  return refreshed;
}

export async function stageDocumentFile(file: {
  filename: string;
  contentType: string;
  data: Buffer;
  size: number;
}): Promise<UploadedFile> {
  return getUploadService().upload(file);
}

/**
 * Upload or replace a partner document of a given type.
 * Replace resets verification to Pending.
 * On the locked client base (no Documents table), files go to Partners.Resume.
 */
export async function uploadPartnerDocument(input: {
  partnerId: string;
  documentType: PartnerDocumentType;
  upload: UploadedFile;
}): Promise<PartnerDocument> {
  if (!getOptionalAirtableTableName("documentsTable")) {
    const attached = await uploadPartnerDocumentToResume(input);
    try {
      const { notifyDocumentUploaded } = await import(
        "@/features/notifications/services/notification-events"
      );
      const { DOCUMENT_TYPE_LABELS } = await import(
        "@/features/partner-documents/types"
      );
      await notifyDocumentUploaded({
        partnerId: input.partnerId,
        partnerLabel: attached.partnerName ?? input.partnerId,
        documentType: DOCUMENT_TYPE_LABELS[input.documentType],
        documentId: attached.id,
      });
    } catch (error) {
      console.error("Failed to publish document upload notification", error);
    }
    return attached;
  }

  const existing = await listDocuments({
    partnerId: input.partnerId,
    documentType: input.documentType,
  });
  const current = existing[0] ?? null;

  if (current) {
    await patchDocument(
      current.id,
      toAirtableUpdateFields({
        verificationStatus: "pending",
        verifiedById: null,
        verifiedAt: null,
        rejectionReason: null,
        uploadedAt: new Date().toISOString(),
        status: "active",
      }),
    );
    const attached = await attachFileToDocument(current.id, input.upload);
    await syncPartnerVerificationFromDocuments(input.partnerId);
    return attached;
  }

  const created = await insertDocument(
    toAirtableCreateFields({
      partnerId: input.partnerId,
      documentType: input.documentType,
      verificationStatus: "pending",
      status: "active",
    }),
  );

  const attached = await attachFileToDocument(created.id, input.upload);
  await syncPartnerVerificationFromDocuments(input.partnerId);

  try {
    const { notifyDocumentUploaded } = await import(
      "@/features/notifications/services/notification-events"
    );
    const { DOCUMENT_TYPE_LABELS } = await import(
      "@/features/partner-documents/types"
    );
    await notifyDocumentUploaded({
      partnerId: input.partnerId,
      partnerLabel: attached.partnerName ?? input.partnerId,
      documentType: DOCUMENT_TYPE_LABELS[input.documentType],
      documentId: attached.id,
    });
  } catch (error) {
    console.error("Failed to publish document upload notification", error);
  }

  return attached;
}

async function applyVerificationChange(input: {
  documentId: string;
  toStatus: Exclude<DocumentVerificationStatus, "pending">;
  actorUserId: string;
  rejectionReason?: string | null;
}): Promise<PartnerDocument> {
  const current = await getDocumentById(input.documentId);
  if (!current) {
    throw new Error("Document not found");
  }
  if (current.status === "archived") {
    throw new Error("Archived documents cannot be verified");
  }

  const fromStatus = current.verificationStatus;
  const updated = await patchDocument(
    input.documentId,
    toAirtableUpdateFields({
      verificationStatus: input.toStatus,
      verifiedById: input.actorUserId,
      verifiedAt: new Date().toISOString(),
      rejectionReason:
        input.toStatus === "rejected"
          ? (input.rejectionReason ?? null)
          : null,
    }),
  );

  try {
    await recordActivity({
      entityType: "partner_document",
      entityId: input.documentId,
      action: "document_verification",
      fromStatus,
      toStatus: input.toStatus,
      actorUserId: input.actorUserId,
      note:
        input.toStatus === "rejected"
          ? (input.rejectionReason ?? null)
          : null,
    });
  } catch (error) {
    console.error("Failed to record document verification activity", error);
  }

  await syncPartnerVerificationFromDocuments(updated.partnerId);

  try {
    const {
      notifyDocumentRejected,
      notifyDocumentVerified,
    } = await import("@/features/notifications/services/notification-events");
    const { DOCUMENT_TYPE_LABELS } = await import(
      "@/features/partner-documents/types"
    );
    const label = DOCUMENT_TYPE_LABELS[updated.documentType];
    if (input.toStatus === "verified") {
      await notifyDocumentVerified({
        partnerId: updated.partnerId,
        documentType: label,
        documentId: updated.id,
      });
    } else {
      await notifyDocumentRejected({
        partnerId: updated.partnerId,
        documentType: label,
        documentId: updated.id,
        reason: input.rejectionReason ?? "Document rejected",
      });
    }
  } catch (error) {
    console.error("Failed to publish document notification", error);
  }

  const [enriched] = await withEnrichment([updated]);
  return enriched ?? updated;
}

export async function verifyPartnerDocument(input: {
  documentId: string;
  actorUserId: string;
}): Promise<PartnerDocument> {
  return applyVerificationChange({
    documentId: input.documentId,
    toStatus: "verified",
    actorUserId: input.actorUserId,
  });
}

export async function rejectPartnerDocument(input: {
  documentId: string;
  actorUserId: string;
  rejectionReason: string;
}): Promise<PartnerDocument> {
  return applyVerificationChange({
    documentId: input.documentId,
    toStatus: "rejected",
    actorUserId: input.actorUserId,
    rejectionReason: input.rejectionReason,
  });
}

export async function archivePartnerDocument(
  documentId: string,
): Promise<PartnerDocument> {
  const current = await getDocumentById(documentId);
  if (!current) {
    throw new Error("Document not found");
  }

  const updated = await patchDocument(
    documentId,
    toAirtableUpdateFields({ status: "archived" }),
  );

  await syncPartnerVerificationFromDocuments(current.partnerId);

  const [enriched] = await withEnrichment([updated]);
  return enriched ?? updated;
}

/**
 * Roll partner-level verification from active required document slots.
 * Payout readiness can later gate on partner.verificationStatus === "verified".
 */
export async function syncPartnerVerificationFromDocuments(
  partnerId: string,
): Promise<void> {
  const partner = await findPartnerById(partnerId);
  if (!partner) {
    return;
  }

  const slots = buildDocumentSlots(await listDocumentsForPartner(partnerId));
  let next: PartnerVerificationStatus = "pending";

  const docs = slots
    .map((slot) => slot.document)
    .filter((doc): doc is PartnerDocument => doc != null);

  if (docs.some((doc) => doc.verificationStatus === "rejected")) {
    next = "rejected";
  } else if (
    REQUIRED_DOCUMENT_TYPES.every((type) => {
      const slot = slots.find((s) => s.documentType === type);
      return slot?.document?.verificationStatus === "verified";
    })
  ) {
    next = "verified";
  }

  if (partner.verificationStatus === next) {
    return;
  }

  await patchPartner(
    partnerId,
    toPartnerUpdateFields({ verificationStatus: next }),
  );
}
