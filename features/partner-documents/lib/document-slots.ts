import type {
  PartnerDocument,
  PartnerDocumentSlot,
  PartnerDocumentSummary,
  PartnerDocumentType,
} from "@/features/partner-documents/types";
import {
  DOCUMENT_TYPE_LABELS,
  REQUIRED_DOCUMENT_TYPES,
} from "@/features/partner-documents/types";

export function buildDocumentSlots(
  documents: PartnerDocument[],
): PartnerDocumentSlot[] {
  const byType = new Map<PartnerDocumentType, PartnerDocument>();
  for (const doc of documents) {
    if (doc.status !== "active") {
      continue;
    }
    const existing = byType.get(doc.documentType);
    if (!existing) {
      byType.set(doc.documentType, doc);
      continue;
    }
    const existingTime = existing.uploadedAt ?? "";
    const nextTime = doc.uploadedAt ?? "";
    if (nextTime > existingTime) {
      byType.set(doc.documentType, doc);
    }
  }

  return REQUIRED_DOCUMENT_TYPES.map((documentType) => ({
    documentType,
    label: DOCUMENT_TYPE_LABELS[documentType],
    document: byType.get(documentType) ?? null,
  }));
}

export function summarizeDocuments(
  documents: PartnerDocument[],
): PartnerDocumentSummary {
  const active = documents.filter((d) => d.status === "active");
  return {
    total: active.length,
    pending: active.filter((d) => d.verificationStatus === "pending").length,
    verified: active.filter((d) => d.verificationStatus === "verified").length,
    rejected: active.filter((d) => d.verificationStatus === "rejected").length,
  };
}
