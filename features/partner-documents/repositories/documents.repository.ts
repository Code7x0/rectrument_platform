import {
  createRecord,
  findRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
  type AirtableListOptions,
} from "@/lib/airtable/client";
import { AirtableStorageUnavailableError } from "@/lib/airtable/errors";
import { getOptionalAirtableTableName } from "@/lib/airtable/tables";
import { mapPartnerDocumentRecord } from "@/features/partner-documents/services/documents.mapper";
import {
  deriveDocumentsFromPartnerResumes,
  isDerivedDocumentId,
  persistDerivedDocumentVerification,
} from "@/features/partner-documents/services/documents.derived";
import type { PartnerDocument } from "@/features/partner-documents/types";
import {
  AIRTABLE_DOCUMENT_VERIFICATION,
} from "@/lib/airtable/fields";

function getTableName(): string | null {
  return getOptionalAirtableTableName("documentsTable");
}

export function isDocumentsStorageAvailable(): boolean {
  // Resume + Performance Notes markers support documents without a Documents table.
  return true;
}

export async function findDocuments(
  options: AirtableListOptions = {},
): Promise<PartnerDocument[]> {
  const table = getTableName();
  if (!table) {
    try {
      const derived = await deriveDocumentsFromPartnerResumes();
      const formula = options.filterByFormula ?? "";
      const partnerMatch =
        /FIND\('(rec[A-Za-z0-9]+)', ARRAYJOIN\(\{Partner\}\)\)/.exec(formula);
      if (partnerMatch?.[1]) {
        return derived.filter((row) => row.partnerId === partnerMatch[1]);
      }
      return derived;
    } catch (error) {
      console.error("Failed to derive documents", error);
      return [];
    }
  }
  try {
    const records = await getRecords(table, options);
    return records.map((record) =>
      mapPartnerDocumentRecord({
        id: record.id,
        fields: record.fields as AirtableFields,
      }),
    );
  } catch (error) {
    console.error("Failed to list documents", error);
    return [];
  }
}

export async function findDocumentById(
  recordId: string,
): Promise<PartnerDocument | null> {
  if (isDerivedDocumentId(recordId)) {
    const all = await findDocuments();
    return all.find((row) => row.id === recordId) ?? null;
  }
  const table = getTableName();
  if (!table) {
    return null;
  }
  try {
    const record = await findRecord(table, recordId);
    return mapPartnerDocumentRecord({
      id: record.id,
      fields: record.fields as AirtableFields,
    });
  } catch {
    return null;
  }
}

export async function insertDocument(
  fields: AirtableFields,
): Promise<PartnerDocument> {
  const table = getTableName();
  if (!table) {
    throw new AirtableStorageUnavailableError(
      "documentsTable",
      "Typed document uploads require a Documents table. On the locked client base, store files on Partners.Resume in Airtable.",
    );
  }
  const record = await createRecord(table, fields);
  return mapPartnerDocumentRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}

export async function patchDocument(
  recordId: string,
  fields: AirtableFields,
): Promise<PartnerDocument> {
  if (isDerivedDocumentId(recordId)) {
    const statusLabel = fields["Verification Status"];
    const status =
      typeof statusLabel === "string"
        ? AIRTABLE_DOCUMENT_VERIFICATION[
            statusLabel as keyof typeof AIRTABLE_DOCUMENT_VERIFICATION
          ]
        : undefined;
    const reason =
      typeof fields["Rejection Reason"] === "string"
        ? fields["Rejection Reason"]
        : null;
    if (!status) {
      throw new AirtableStorageUnavailableError(
        "documentsTable",
        "Derived documents only support verification status updates.",
      );
    }
    const updated = await persistDerivedDocumentVerification({
      documentId: recordId,
      status,
      reason,
    });
    if (!updated) {
      throw new Error("Document not found");
    }
    return updated;
  }
  const table = getTableName();
  if (!table) {
    throw new AirtableStorageUnavailableError("documentsTable");
  }
  const record = await updateRecord(table, recordId, fields);
  return mapPartnerDocumentRecord({
    id: record.id,
    fields: record.fields as AirtableFields,
  });
}
