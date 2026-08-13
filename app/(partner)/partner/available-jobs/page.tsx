import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { PartnerAvailableJobsPageClient } from "@/features/job-claims/components";
import { listPartnerAvailableJobs } from "@/features/job-claims/services/job-claims.service";
import type { PartnerAvailableJob } from "@/features/job-claims/types";
import { getAppSession, roleHasPermission } from "@/lib/auth";

export default async function PartnerAvailableJobsPage() {
  noStore();

  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (session.role !== "partner") {
    redirect("/forbidden");
  }
  if (!roleHasPermission(session.role, "view_own_allocations")) {
    redirect("/forbidden");
  }
  if (!session.partnerId) {
    redirect("/unauthorized");
  }

  let jobs: PartnerAvailableJob[] = [];
  let loadError: string | null = null;
  try {
    jobs = await listPartnerAvailableJobs(session.partnerId);
  } catch (error) {
    console.error("[partner/available-jobs] list failed", error);
    loadError =
      "Unable to load available jobs right now. Please reload and try again.";
  }

  return (
    <ContentContainer>
      <Breadcrumb
        items={[
          { label: "Partner", href: "/partner" },
          { label: "Available Jobs" },
        ]}
      />
      <PageHeader
        title="Available Jobs"
        description="Browse open jobs and request to work on them. Client details unlock only after approval."
      />
      {loadError ? (
        <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {loadError}
        </p>
      ) : null}
      <PartnerAvailableJobsPageClient jobs={jobs} />
    </ContentContainer>
  );
}
