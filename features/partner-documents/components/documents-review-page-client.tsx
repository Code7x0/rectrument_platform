"use client";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { AdminDocumentsTable } from "@/features/partner-documents/components/admin-documents-table";
import type { PartnerDocument } from "@/features/partner-documents/types";

interface DocumentsReviewPageClientProps {
  documents: PartnerDocument[];
  canVerify: boolean;
  canArchive: boolean;
  title: string;
  description: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function DocumentsReviewPageClient({
  documents,
  canVerify,
  canArchive,
  title,
  description,
  breadcrumbs,
}: DocumentsReviewPageClientProps) {
  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader title={title} description={description} />
      <AdminDocumentsTable
        documents={documents}
        canVerify={canVerify}
        canArchive={canArchive}
      />
    </ContentContainer>
  );
}
