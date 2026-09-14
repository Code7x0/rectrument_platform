"use client";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import {
  WorkspaceMetricCard,
} from "@/features/shared/workspace";
import { PartnerDocumentCards } from "@/features/partner-documents/components/partner-document-cards";
import type { PartnerPortalDocumentSummary } from "@/features/partner-documents/lib/partner-portal-documents";
import type { PartnerDocumentSlot } from "@/features/partner-documents/types";

interface PartnerDocumentsPageClientProps {
  slots: PartnerDocumentSlot[];
  summary: PartnerPortalDocumentSummary;
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
        description="Upload PAN and Aadhaar. Agreement appears here only if one was uploaded."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <WorkspaceMetricCard label="Uploaded" value={summary.uploaded} />
        <WorkspaceMetricCard
          label="Required missing"
          value={summary.missingRequired}
        />
      </div>
      <PartnerDocumentCards
        slots={slots}
        canUpload={canUpload}
        showVerification={false}
      />
    </ContentContainer>
  );
}
