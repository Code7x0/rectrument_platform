"use client";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import {
  WorkspaceMetricCard,
} from "@/features/shared/workspace";
import { PartnerDocumentCards } from "@/features/partner-documents/components/partner-document-cards";
import type {
  PartnerDocumentSlot,
  PartnerDocumentSummary,
} from "@/features/partner-documents/types";

interface PartnerDocumentsPageClientProps {
  slots: PartnerDocumentSlot[];
  summary: PartnerDocumentSummary;
  canUpload: boolean;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function PartnerDocumentsPageClient({
  slots,
  summary,
  canUpload,
  breadcrumbs,
}: PartnerDocumentsPageClientProps) {
  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="Documents"
        description="Upload PAN, Aadhaar, and Agreement for verification."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <WorkspaceMetricCard label="Total" value={summary.total} />
        <WorkspaceMetricCard label="Pending" value={summary.pending} />
        <WorkspaceMetricCard label="Verified" value={summary.verified} />
        <WorkspaceMetricCard label="Rejected" value={summary.rejected} />
      </div>
      <PartnerDocumentCards slots={slots} canUpload={canUpload} />
    </ContentContainer>
  );
}
