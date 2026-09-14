import type { PartnerStatus } from "@/features/shared/entities";

import {
  buildDocumentSlots,
  visibleDocumentTypes,
} from "@/features/partner-documents/lib/document-slots";
import type {
  PartnerDocument,
  PartnerDocumentSlot,
} from "@/features/partner-documents/types";

export interface PartnerPortalDocumentSummary {
  uploaded: number;
  missingRequired: number;
}

/** Active partners do not go through per-document verification in the portal. */
export function normalizePartnerDocumentsForPortal(
  documents: PartnerDocument[],
  partnerStatus: PartnerStatus,
): PartnerDocument[] {
  if (partnerStatus !== "active") {
    return documents;
  }

  return documents.map((doc) =>
    doc.verificationStatus === "rejected"
      ? doc
      : { ...doc, verificationStatus: "verified" },
  );
}

export function summarizePartnerPortalDocuments(
  documents: PartnerDocument[],
): PartnerPortalDocumentSummary {
  const slots = buildDocumentSlots(documents);
  const byType = new Map(
    slots
      .filter((slot) => slot.document)
      .map((slot) => [slot.documentType, slot.document!]),
  );
  const requiredTypes = visibleDocumentTypes(byType).filter(
    (type) => type === "pan" || type === "aadhaar",
  );
  const uploaded = requiredTypes.filter((type) =>
    Boolean(byType.get(type)?.fileUrl),
  ).length;

  return {
    uploaded,
    missingRequired: requiredTypes.length - uploaded,
  };
}

export function partnerDocumentHasFile(slot: PartnerDocumentSlot): boolean {
  return Boolean(slot.document?.fileUrl?.trim());
}
