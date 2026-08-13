import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { JobClaimsReviewPageClient } from "@/features/job-claims/components";
import { listJobClaimsForAccountManager } from "@/features/job-claims/services/job-claims.service";
import type { JobClaimReviewItem } from "@/features/job-claims/types";
import {
  getAppSession,
  resolveAccountManagerScopeId,
  roleHasPermission,
} from "@/lib/auth";

export default async function AccountManagerJobClaimsPage() {
  noStore();

  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (session.role !== "account_manager") {
    redirect("/forbidden");
  }
  if (!roleHasPermission(session.role, "manage_allocations")) {
    redirect("/forbidden");
  }

  const amId = resolveAccountManagerScopeId(session);
  if (!amId) {
    redirect("/unauthorized");
  }

  let items: JobClaimReviewItem[] = [];
  let loadError: string | null = null;
  try {
    items = await listJobClaimsForAccountManager(amId);
  } catch (error) {
    console.error("[account-manager/job-claims] list failed", error);
    loadError =
      "Unable to load job claims right now. Please reload and try again.";
  }

  return (
    <ContentContainer>
      <Breadcrumb
        items={[
          { label: "Account Manager", href: "/account-manager" },
          { label: "Job Claims" },
        ]}
      />
      <PageHeader
        title="Job Claims"
        description="Review Partner requests to work on your jobs. Approve to create an allocation."
      />
      {loadError ? (
        <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {loadError}
        </p>
      ) : null}
      <JobClaimsReviewPageClient items={items} />
    </ContentContainer>
  );
}
