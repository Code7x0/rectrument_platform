import { notFound, redirect } from "next/navigation";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { PartnerAvailableJobDetailPageClient } from "@/features/job-claims/components/partner-available-job-detail-page-client";
import { getPartnerAvailableJob } from "@/features/job-claims/services/job-claims.service";
import { getPartnerWorkTask } from "@/features/tasks/services";
import { getAppSession, roleHasPermission } from "@/lib/auth";

export default async function PartnerAvailableJobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (session.role !== "partner" || !session.partnerId) {
    redirect("/forbidden");
  }
  if (!roleHasPermission(session.role, "view_own_allocations")) {
    redirect("/forbidden");
  }

  const { jobId } = await params;
  const job = await getPartnerAvailableJob(session.partnerId, jobId);
  if (!job) {
    const assigned = await getPartnerWorkTask(session.partnerId, jobId);
    if (assigned) {
      redirect(`/partner/jobs/${encodeURIComponent(jobId)}`);
    }
    notFound();
  }

  return (
    <ContentContainer>
      <Breadcrumb
        items={[
          { label: "Partner", href: "/partner" },
          { label: "Available Jobs", href: "/partner/available-jobs" },
          { label: job.title },
        ]}
      />
      <PageHeader
        title={job.title}
        description="Standalone job detail page for reviewing open roles before you submit a claim."
      />
      <PartnerAvailableJobDetailPageClient job={job} />
    </ContentContainer>
  );
}
