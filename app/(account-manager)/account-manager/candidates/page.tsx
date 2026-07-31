import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import {
  getAppSession,
  roleHasPermission,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import { listAccountManagerJobIds } from "@/lib/auth/scope";
import { listJobs } from "@/features/jobs/services";
import { ReviewQueuePageClient } from "@/features/tasks/components";
import { listSubmissions } from "@/features/submissions/services";

/**
 * AM Candidates — same source of truth as dashboard Submissions metric:
 * all linked submissions on owned jobs (not a separate cached counter).
 */
export default async function AccountManagerReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ submissionId?: string }>;
}) {
  noStore();

  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (session.role !== "account_manager") {
    redirect("/forbidden");
  }

  if (!roleHasPermission(session.role, "view_submissions")) {
    redirect("/forbidden");
  }

  const accountManagerId = resolveAccountManagerScopeId(session);
  if (!accountManagerId) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const submissionId = params.submissionId?.trim() || null;

  const [jobIds, jobs] = await Promise.all([
    listAccountManagerJobIds(accountManagerId),
    listJobs({ accountManagerId, includeArchived: true }),
  ]);
  const jobIdSet = new Set(jobIds);
  const jobTitleById = new Map(jobs.map((job) => [job.id, job.title]));
  const submissions =
    jobIds.length === 0
      ? []
      : (await listSubmissions({ enrich: false }))
          .filter((row) => jobIdSet.has(row.jobId))
          .map((row) => ({
            ...row,
            jobTitle: row.jobTitle ?? jobTitleById.get(row.jobId) ?? null,
          }));

  return (
    <ReviewQueuePageClient
      initialSubmissions={submissions}
      initialSubmissionId={submissionId}
      canTransition={roleHasPermission(session.role, "review_candidates")}
      canDelete={roleHasPermission(session.role, "delete_candidates")}
      hideClientName
      title="Candidates"
      description="All submissions on your assigned jobs. Update status as candidates move through the pipeline."
      emptyTitle="No candidates yet"
      emptyDescription="When Talent Partners submit profiles on your jobs, they appear here automatically."
      breadcrumbs={[
        { label: "Account Manager", href: "/account-manager" },
        { label: "Candidates" },
      ]}
    />
  );
}
