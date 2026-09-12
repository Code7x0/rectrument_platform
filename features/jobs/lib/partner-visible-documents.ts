import type { JobDocument } from "@/features/shared/entities";

const PARTNER_VISIBLE_DOCUMENT_LABELS = new Set([
  "Job Description",
  "Sample Profiling",
]);

/** Partners may only see JD and sample profiling attachments. */
export function filterPartnerVisibleJobDocuments(
  documents: JobDocument[],
): JobDocument[] {
  return documents.filter((doc) => PARTNER_VISIBLE_DOCUMENT_LABELS.has(doc.label));
}
