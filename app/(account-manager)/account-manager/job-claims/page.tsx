import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { JobClaimsReviewPageClient } from "@/features/job-claims/components";
import { listJobClaimsForAccountManager } from "@/features/job-claims/services/job-claims.service";
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

  const items = await listJobClaimsForAccountManager(amId);

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
      <JobClaimsReviewPageClient items={items} />
    </ContentContainer>
  );
}
