import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { JobClaimsReviewPageClient } from "@/features/job-claims/components";
import { listJobClaimsForAdmin } from "@/features/job-claims/services/job-claims.service";
import type { JobClaimReviewItem } from "@/features/job-claims/types";
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

  let items: JobClaimReviewItem[] = [];
  let loadError: string | null = null;
  try {
    items = await listJobClaimsForAdmin();
  } catch (error) {
    console.error("[admin/job-claims] list failed", error);
    loadError =
      "Unable to load job claims right now. Please reload and try again.";
  }

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
      {loadError ? (
        <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {loadError}
        </p>
      ) : null}
      <JobClaimsReviewPageClient
        items={items}
        description="Review Partner job claim requests. Approval creates the standard Partner allocation."
      />
    </ContentContainer>
  );
}
