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

/**
 * Always show PAN + Aadhaar.
 * Show Agreement only when an agreement file actually exists —
 * registration no longer requires a signed agreement upload.
 */
export function visibleDocumentTypes(
  byType: Map<PartnerDocumentType, PartnerDocument>,
): PartnerDocumentType[] {
  const types: PartnerDocumentType[] = REQUIRED_DOCUMENT_TYPES.filter(
    (type) => type !== "agreement",
  );
  if (byType.has("agreement")) {
    types.push("agreement");
  }
  return types;
}

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

  return visibleDocumentTypes(byType).map((documentType) => ({
    documentType,
    label: DOCUMENT_TYPE_LABELS[documentType],
    document: byType.get(documentType) ?? null,
  }));
}

/**
 * Metrics must match the visible slots (one card per type), not raw
 * Partners.Resume attachment count (which can include resumes).
 */
export function summarizeDocuments(
  documents: PartnerDocument[],
): PartnerDocumentSummary {
  const slots = buildDocumentSlots(documents);
  const uploaded = slots
    .map((slot) => slot.document)
    .filter((doc): doc is PartnerDocument => Boolean(doc?.fileUrl));

  return {
    total: uploaded.length,
    pending: uploaded.filter((d) => d.verificationStatus === "pending").length,
    verified: uploaded.filter((d) => d.verificationStatus === "verified")
      .length,
    rejected: uploaded.filter((d) => d.verificationStatus === "rejected")
      .length,
  };
}
