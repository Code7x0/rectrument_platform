import { notFound, redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import {
  PartnerWorkspacePageClient,
  type PartnerWorkspaceTabId,
} from "@/features/partners/workspace";
import {
  getPartnerById,
  getPartnerDocumentSummary,
  getPartnerPerformanceStats,
} from "@/features/partners/services";
import { listDocumentsForPartner } from "@/features/partner-documents/services";
import { listAllocations } from "@/features/allocations/services";
import { listSubmissions } from "@/features/submissions/services";

const TABS: PartnerWorkspaceTabId[] = [
  "overview",
  "assigned-jobs",
  "submissions",
  "documents",
  "performance",
  "activity",
];

function parseTab(value: string | undefined): PartnerWorkspaceTabId {
  if (value && TABS.includes(value as PartnerWorkspaceTabId)) {
    return value as PartnerWorkspaceTabId;
  }
  return "overview";
}

export default async function AdminPartnerWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "manage_partners")) {
    redirect("/forbidden");
  }

  const { partnerId } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = parseTab(tabParam);

  const partner = await getPartnerById(partnerId);
  if (!partner) {
    notFound();
  }

  const [performance, documentSummary, documents, allocations, submissions] =
    await Promise.all([
      getPartnerPerformanceStats(partnerId),
      getPartnerDocumentSummary(partnerId),
      listDocumentsForPartner(partnerId),
      listAllocations({ partnerId, includeArchived: true }),
      listSubmissions({ partnerId }),
    ]);

  const { getEntityTimeline } = await import("@/features/activity/services");
  const activityTimeline = await getEntityTimeline(
    session,
    { kind: "partner", id: partnerId },
    { page: 1, pageSize: 40 },
  );

  return (
    <PartnerWorkspacePageClient
      partner={partner}
      performance={performance}
      documentSummary={documentSummary}
      documents={documents}
      allocations={allocations}
      submissions={submissions}
      activityTimeline={activityTimeline}
      tab={tab}
      canUpdate={roleHasPermission(session.role, "manage_partners")}
      canManageAllocations={false}
      canArchiveAllocations={false}
      canVerifyDocuments={roleHasPermission(session.role, "verify_documents")}
      canArchiveDocuments={roleHasPermission(session.role, "archive_documents")}
      canUploadDocuments={roleHasPermission(session.role, "manage_partners")}
      canManageIdentityVisibility={roleHasPermission(
        session.role, "manage_identity_visibility",
      )}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Talent Partners", href: "/admin/partners" },
        { label: partner.companyName },
      ]}
    />
  );
}
