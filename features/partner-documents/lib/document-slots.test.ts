import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDocumentSlots,
  summarizeDocuments,
} from "@/features/partner-documents/lib/document-slots";
import type { PartnerDocument } from "@/features/partner-documents/types";

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

test("summary matches visible slots — ignores duplicate types", () => {
  const documents = [
    doc({ id: "1", documentType: "pan" }),
    doc({ id: "2", documentType: "aadhaar" }),
    doc({ id: "3", documentType: "agreement" }),
    doc({ id: "4", documentType: "agreement", fileName: "agreement_old.pdf" }),
  ];

  const summary = summarizeDocuments(documents);
  assert.equal(summary.total, 3);
  assert.equal(summary.pending, 3);

  const slots = buildDocumentSlots(documents);
  assert.equal(slots.length, 3);
  assert.deepEqual(
    slots.map((s) => s.documentType),
    ["pan", "aadhaar", "agreement"],
  );
});

test("agreement slot is hidden when no agreement file exists", () => {
  const documents = [
    doc({ id: "1", documentType: "pan" }),
    doc({ id: "2", documentType: "aadhaar" }),
  ];

  const slots = buildDocumentSlots(documents);
  assert.equal(slots.length, 2);
  assert.ok(!slots.some((s) => s.documentType === "agreement"));

  const summary = summarizeDocuments(documents);
  assert.equal(summary.total, 2);
  assert.equal(summary.pending, 2);
});
