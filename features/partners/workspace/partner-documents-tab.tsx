"use client";

import {
  WorkspaceMetricCard,
  WorkspaceSection,
} from "@/features/shared/workspace";
import { AdminDocumentsTable } from "@/features/partner-documents/components/admin-documents-table";
import { PartnerDocumentCards } from "@/features/partner-documents/components/partner-document-cards";
import {
  buildDocumentSlots,
  summarizeDocuments,
} from "@/features/partner-documents/lib/document-slots";
import type { PartnerDocument } from "@/features/partner-documents/types";
import type { PartnerDocumentSummary } from "@/features/partners/types";

interface PartnerDocumentsTabProps {
  summary: PartnerDocumentSummary;
  documents: PartnerDocument[];
  partnerId: string;
  canVerify: boolean;
  canArchive: boolean;
  canUpload: boolean;
}

/**
 * Partner Workspace — Documents tab.
 * Admin/AM review the partner's slots; admin may also upload on behalf.
 */
export function PartnerDocumentsTab({
  summary,
  documents,
  partnerId,
  canVerify,
  canArchive,
  canUpload,
}: PartnerDocumentsTabProps) {
  const slots = buildDocumentSlots(documents);
  const counts = summarizeDocuments(documents);
  const metrics = summary.total > 0 ? summary : counts;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <WorkspaceMetricCard label="Total" value={metrics.total} />
        <WorkspaceMetricCard label="Pending" value={metrics.pending} />
        <WorkspaceMetricCard label="Verified" value={metrics.verified} />
        <WorkspaceMetricCard label="Rejected" value={metrics.rejected} />
      </div>

      <PartnerDocumentCards
        slots={slots}
        canUpload={canUpload}
        partnerIdForAdmin={canUpload ? partnerId : undefined}
      />

      <WorkspaceSection title="Review queue">
        <AdminDocumentsTable
          documents={documents}
          canVerify={canVerify}
          canArchive={canArchive}
        />
      </WorkspaceSection>
    </div>
  );
}
