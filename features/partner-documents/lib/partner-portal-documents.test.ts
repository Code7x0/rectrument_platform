import assert from "node:assert/strict";
import test from "node:test";

import type { PartnerDocument } from "@/features/partner-documents/types";

import {
  normalizePartnerDocumentsForPortal,
  partnerDocumentHasFile,
  summarizePartnerPortalDocuments,
} from "./partner-portal-documents";
import { buildDocumentSlots } from "./document-slots";

function doc(
  partial: Partial<PartnerDocument> &
    Pick<PartnerDocument, "id" | "documentType">,
): PartnerDocument {
  return {
    documentCode: null,
    partnerId: "recPartner",
    partnerName: "Partner",
    fileUrl: "https://example.com/file.pdf",
    fileName: `${partial.documentType}.pdf`,
    uploadedAt: null,
    verificationStatus: "pending",
    verifiedById: null,
    verifiedByName: null,
    verifiedAt: null,
    rejectionReason: null,
    notes: null,
    status: "active",
    ...partial,
  };
}

test("normalizePartnerDocumentsForPortal marks active partner docs as verified", () => {
  const normalized = normalizePartnerDocumentsForPortal(
    [doc({ id: "1", documentType: "pan" })],
    "active",
  );
  assert.equal(normalized[0]?.verificationStatus, "verified");
});

test("summarizePartnerPortalDocuments counts uploaded and missing required docs", () => {
  const summary = summarizePartnerPortalDocuments([
    doc({ id: "1", documentType: "pan" }),
  ]);
  assert.equal(summary.uploaded, 1);
  assert.equal(summary.missingRequired, 1);
});

test("partnerDocumentHasFile requires a file URL", () => {
  const slots = buildDocumentSlots([
    doc({ id: "1", documentType: "pan", fileUrl: null }),
  ]);
  assert.equal(partnerDocumentHasFile(slots[0]!), false);
});
