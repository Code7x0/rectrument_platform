import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { getPayoutMapForPartner } from "@/features/payouts/services";
import { PartnerSubmissionsPageClient } from "@/features/submissions/components";
import { enrichSubmissionsWithLastActivity } from "@/features/submissions/lib/enrich-submission-activity";
import { listPartnerSubmissions } from "@/features/submissions/services";
import type { Payout } from "@/features/payouts/types";

export default async function PartnerCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    jobId?: string;
    status?: string;
    statusGroup?: string;
    submissionId?: string;
  }>;
}) {
  noStore();

  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (session.role !== "partner") {
    redirect("/forbidden");
  }

  if (!roleHasPermission(session.role, "submit_candidates")) {
    redirect("/forbidden");
  }

  if (!session.partnerId) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const jobId = params.jobId?.trim() || null;
  const status = params.status?.trim() || null;
  const statusGroup = params.statusGroup?.trim() || null;
  const submissionId = params.submissionId?.trim() || null;

  const [rawSubmissions, payoutMap] = await Promise.all([
    listPartnerSubmissions(session.partnerId),
    getPayoutMapForPartner(session.partnerId),
  ]);

  const submissions = await enrichSubmissionsWithLastActivity(rawSubmissions);

  const payoutsBySubmission: Record<string, Payout> = Object.fromEntries(
    payoutMap.entries(),
  );

  const filterJobRow =
    jobId != null
      ? submissions.find((row) => row.jobId === jobId) ?? null
      : null;
  const filterJobTitle = filterJobRow?.jobTitle ?? null;
  const filterJobCode = filterJobRow?.jobCode ?? null;

  return (
    <PartnerSubmissionsPageClient
      submissions={submissions}
      payoutsBySubmission={payoutsBySubmission}
      filterJobId={jobId}
      initialSubmissionId={submissionId}
      initialStatus={status}
      initialStatusGroup={statusGroup}
      filterJobLabel={
        filterJobCode || filterJobTitle
          ? [filterJobCode, filterJobTitle].filter(Boolean).join(" · ")
          : jobId
      }
      breadcrumbs={[
        { label: "Partner", href: "/partner" },
        { label: "My Candidates" },
      ]}
    />
  );
}
