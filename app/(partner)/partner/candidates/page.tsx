import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { getPayoutMapForPartner } from "@/features/payouts/services";
import { PartnerSubmissionsPageClient } from "@/features/submissions/components";
import { listPartnerSubmissions } from "@/features/submissions/services";
import type { Payout } from "@/features/payouts/types";

export default async function PartnerCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    jobId?: string;
    status?: string;
    statusGroup?: string;
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

  const [allSubmissions, payoutMap] = await Promise.all([
    listPartnerSubmissions(session.partnerId),
    getPayoutMapForPartner(session.partnerId),
  ]);

  const submissions = jobId
    ? allSubmissions.filter((row) => row.jobId === jobId)
    : allSubmissions;

  const payoutsBySubmission: Record<string, Payout> = Object.fromEntries(
    payoutMap.entries(),
  );

  const filterJobTitle =
    jobId != null
      ? (submissions[0]?.jobTitle ??
        allSubmissions.find((row) => row.jobId === jobId)?.jobTitle ??
        null)
      : null;
  const filterJobCode =
    jobId != null
      ? (submissions[0]?.jobCode ??
        allSubmissions.find((row) => row.jobId === jobId)?.jobCode ??
        null)
      : null;

  return (
    <PartnerSubmissionsPageClient
      submissions={submissions}
      payoutsBySubmission={payoutsBySubmission}
      filterJobId={jobId}
      initialStatus={status}
      initialStatusGroup={statusGroup}
      filterJobLabel={
        filterJobCode || filterJobTitle
          ? [filterJobCode, filterJobTitle].filter(Boolean).join(" · ")
          : jobId
      }
      breadcrumbs={[
        { label: "Partner", href: "/partner" },
        { label: "Assigned Jobs", href: "/partner/jobs" },
        { label: "My Candidates" },
      ]}
    />
  );
}
