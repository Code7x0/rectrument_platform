"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { WorkspaceShell } from "@/features/shared/workspace";
import { Button } from "@/components/ui/button";
import { PartnerDialog } from "@/features/partners/components/partner-dialog";
import { PartnerOverviewTab } from "@/features/partners/workspace/partner-overview-tab";
import { PartnerAssignedJobsTab } from "@/features/partners/workspace/partner-assigned-jobs-tab";
import { PartnerSubmissionsTab } from "@/features/partners/workspace/partner-submissions-tab";
import { PartnerDocumentsTab } from "@/features/partners/workspace/partner-documents-tab";
import { PartnerPerformanceTab } from "@/features/partners/workspace/partner-performance-tab";
import { IdentityVisibilityControl } from "@/features/users/components/identity-visibility-control";
import { ActivityDrawer } from "@/features/activity/components/activity-drawer";
import { EntityActivityPanel } from "@/features/activity/components/entity-activity-panel";
import type { TimelineListResult } from "@/features/activity/types";
import type { Allocation } from "@/features/allocations/types";
import type { PartnerDocument } from "@/features/partner-documents/types";
import type { Submission } from "@/features/submissions/types";
import type {
  Partner,
  PartnerDocumentSummary,
  PartnerPerformanceStats,
} from "@/features/partners/types";

export type PartnerWorkspaceTabId =
  | "overview"
  | "assigned-jobs"
  | "submissions"
  | "documents"
  | "performance"
  | "activity";

interface PartnerWorkspacePageClientProps {
  partner: Partner;
  performance: PartnerPerformanceStats;
  documentSummary: PartnerDocumentSummary;
  documents: PartnerDocument[];
  allocations: Allocation[];
  submissions: Submission[];
  tab: PartnerWorkspaceTabId;
  canUpdate: boolean;
  canManageAllocations: boolean;
  canArchiveAllocations: boolean;
  canVerifyDocuments: boolean;
  canArchiveDocuments: boolean;
  canUploadDocuments: boolean;
  canManageIdentityVisibility?: boolean;
  activityTimeline: TimelineListResult;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function PartnerWorkspacePageClient({
  partner,
  performance,
  documentSummary,
  documents,
  allocations,
  submissions,
  tab,
  canUpdate,
  canManageAllocations,
  canArchiveAllocations,
  canVerifyDocuments,
  canArchiveDocuments,
  canUploadDocuments,
  canManageIdentityVisibility = false,
  activityTimeline,
  breadcrumbs,
}: PartnerWorkspacePageClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const basePath = `/admin/partners/${partner.id}`;

  const tabs = [
    { id: "overview", label: "Overview", href: basePath },
    {
      id: "assigned-jobs",
      label: `Assigned Jobs (${performance.activeJobs})`,
      href: `${basePath}?tab=assigned-jobs`,
    },
    {
      id: "submissions",
      label: `Submissions (${performance.profilesSubmitted})`,
      href: `${basePath}?tab=submissions`,
    },
    {
      id: "documents",
      label: "Documents",
      href: `${basePath}?tab=documents`,
    },
    {
      id: "performance",
      label: "Performance",
      href: `${basePath}?tab=performance`,
    },
    {
      id: "activity",
      label: "Activity",
      href: `${basePath}?tab=activity`,
    },
  ];

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <WorkspaceShell
        title={partner.companyName}
        subtitle={partner.contactName}
        tabs={tabs}
        activeTab={tab}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ActivityDrawer
              entityRef={{ kind: "partner", id: partner.id }}
              title={`${partner.companyName} activity`}
              initial={activityTimeline}
            />
            {canUpdate && partner.status !== "archived" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit Partner
              </Button>
            ) : null}
          </div>
        }
      >
        {tab === "overview" ? (
          <div className="space-y-4">
            {canManageIdentityVisibility ? (
              <IdentityVisibilityControl
                partnerId={partner.id}
                value={partner.identityVisibility}
              />
            ) : null}
            <PartnerOverviewTab partner={partner} performance={performance} />
          </div>
        ) : null}
        {tab === "assigned-jobs" ? (
          <PartnerAssignedJobsTab
            allocations={allocations}
            canManage={canManageAllocations}
            canArchive={canArchiveAllocations}
          />
        ) : null}
        {tab === "submissions" ? (
          <PartnerSubmissionsTab submissions={submissions} />
        ) : null}
        {tab === "documents" ? (
          <PartnerDocumentsTab
            summary={documentSummary}
            documents={documents}
            partnerId={partner.id}
            canVerify={canVerifyDocuments}
            canArchive={canArchiveDocuments}
            canUpload={canUploadDocuments}
          />
        ) : null}
        {tab === "performance" ? (
          <PartnerPerformanceTab stats={performance} />
        ) : null}
        {tab === "activity" ? (
          <EntityActivityPanel
            entityRef={{ kind: "partner", id: partner.id }}
            initial={activityTimeline}
            showFilters
          />
        ) : null}
      </WorkspaceShell>

      <PartnerDialog
        open={editOpen}
        mode="edit"
        partner={partner}
        onOpenChange={setEditOpen}
        onCompleted={() => router.refresh()}
      />
    </ContentContainer>
  );
}
