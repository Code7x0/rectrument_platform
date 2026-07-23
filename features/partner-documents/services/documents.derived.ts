/**
 * Map Partners.Resume attachments → PartnerDocument domain.
 * Verification state stored in Partners.Performance Notes markers.
 */

import {
  findRecord,
  getRecords,
  updateRecord,
  type AirtableFields,
} from "@/lib/airtable/client";
import { asString } from "@/lib/airtable/compat";
import {
  parseDocMarkers,
  upsertDocMarker,
} from "@/lib/airtable/field-markers";
import { PARTNERS_TABLE_FIELDS } from "@/lib/airtable/fields";
import { getAirtableTableName } from "@/lib/airtable/tables";
import type {
  DocumentVerificationStatus,
  PartnerDocument,
} from "@/features/partner-documents/types";

function asAttachments(
  value: unknown,
): Array<{ url: string; filename: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      const row = item as { url?: string; filename?: string };
      if (typeof row.url !== "string") {
        return null;
      }
      return {
        url: row.url,
        filename:
          typeof row.filename === "string" && row.filename.trim()
            ? row.filename
            : "Resume",
      };
    })
    .filter((row): row is { url: string; filename: string } => Boolean(row));
}

function inferDocumentType(
  filename: string,
): PartnerDocument["documentType"] {
  const lower = filename.toLowerCase();
  if (lower.includes("pan")) {
    return "pan";
  }
  if (lower.includes("aadhaar") || lower.includes("aadhar")) {
    return "aadhaar";
  }
  if (lower.includes("agreement") || lower.includes("contract")) {
    return "agreement";
  }
  return "agreement";
}

function filenamesMatch(a: string, b: string): boolean {
  return a.replace(/\s+/g, "_").toLowerCase() === b.replace(/\s+/g, "_").toLowerCase();
}

export async function deriveDocumentsFromPartnerResumes(): Promise<
  PartnerDocument[]
> {
  const records = await getRecords(getAirtableTableName("partnersTable"), {
    fields: [
      PARTNERS_TABLE_FIELDS.partnerId,
      PARTNERS_TABLE_FIELDS.name,
      PARTNERS_TABLE_FIELDS.companyName,
      PARTNERS_TABLE_FIELDS.notes,
      "Resume",
    ],
  });

  const docs: PartnerDocument[] = [];
  for (const record of records) {
    const fields = record.fields as AirtableFields;
    const attachments = asAttachments(fields.Resume);
    const markers = parseDocMarkers(
      asString(fields[PARTNERS_TABLE_FIELDS.notes]),
    );
    const partnerName =
      asString(fields[PARTNERS_TABLE_FIELDS.companyName]) ??
      asString(fields[PARTNERS_TABLE_FIELDS.name]);

    attachments.forEach((file, index) => {
      const marker = markers.find((row) =>
        filenamesMatch(row.filename, file.filename),
      );
      docs.push({
        id: `derived_doc_${record.id}_${index}`,
        documentCode: asString(fields[PARTNERS_TABLE_FIELDS.partnerId]),
        partnerId: record.id,
        partnerName,
        documentType: inferDocumentType(file.filename),
        fileUrl: file.url,
        fileName: file.filename,
        uploadedAt: null,
        verificationStatus: marker?.status ?? "pending",
        verifiedById: null,
        verifiedByName: null,
        verifiedAt: marker?.at ?? null,
        rejectionReason:
          marker?.status === "rejected" ? marker.reason : null,
        notes: marker
          ? "Verification stored in Partners.Performance Notes marker."
          : "Mapped from Partners.Resume.",
        status: "active",
      });
    });
  }

  return docs;
}

export function isDerivedDocumentId(id: string): boolean {
  return id.startsWith("derived_doc_");
}

export function parseDerivedDocumentId(
  id: string,
): { partnerId: string; index: number } | null {
  const match = /^derived_doc_(rec[A-Za-z0-9]+)_(\d+)$/.exec(id);
  if (!match?.[1] || match[2] === undefined) {
    return null;
  }
  return { partnerId: match[1], index: Number(match[2]) };
}

export async function persistDerivedDocumentVerification(input: {
  documentId: string;
  status: DocumentVerificationStatus;
  reason?: string | null;
}): Promise<PartnerDocument | null> {
  const parsed = parseDerivedDocumentId(input.documentId);
  if (!parsed) {
    return null;
  }
  const partnersTable = getAirtableTableName("partnersTable");
  const partner = await findRecord(partnersTable, parsed.partnerId);
  const attachments = asAttachments(partner.fields.Resume);
  const file = attachments[parsed.index];
  if (!file) {
    return null;
  }
  const existingNotes = asString(partner.fields[PARTNERS_TABLE_FIELDS.notes]);
  const nextNotes = upsertDocMarker(existingNotes, {
    filename: file.filename,
    status: input.status,
    reason: input.reason ?? null,
    at: new Date().toISOString(),
  });
  await updateRecord(partnersTable, parsed.partnerId, {
    [PARTNERS_TABLE_FIELDS.notes]: nextNotes,
  });
  const docs = await deriveDocumentsFromPartnerResumes();
  return docs.find((doc) => doc.id === input.documentId) ?? null;
}
