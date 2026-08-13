import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { JobClaimsReviewPageClient } from "@/features/job-claims/components";
import { listJobClaimsForAdmin } from "@/features/job-claims/services/job-claims.service";
import { getAppSession, roleHasPermission } from "@/lib/auth";

export default async function AdminJobClaimsPage() {
  noStore();

  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (session.role !== "admin" && session.role !== "super_admin") {
    redirect("/forbidden");
  }
  if (!roleHasPermission(session.role, "manage_allocations")) {
    redirect("/forbidden");
  }

  const items = await listJobClaimsForAdmin();

  return (
    <ContentContainer>
      <Breadcrumb
        items={[
          {
            label: session.role === "super_admin" ? "Super Admin" : "Admin",
            href: session.role === "super_admin" ? "/super-admin" : "/admin",
          },
          { label: "Job Claims" },
        ]}
      />
      <PageHeader
        title="Job Claims"
        description="Review Partner job claim requests. Approval creates the standard Partner allocation."
      />
      <JobClaimsReviewPageClient items={items} />
    </ContentContainer>
  );
}
