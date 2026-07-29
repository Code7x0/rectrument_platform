import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import {
  getAppSession,
  roleHasPermission,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import { listAccountManagerJobIds } from "@/lib/auth/scope";
import { ReviewQueuePageClient } from "@/features/tasks/components";
import { listSubmissions } from "@/features/submissions/services";

/**
 * AM Candidates — same source of truth as dashboard Submissions metric:
 * all linked submissions on owned jobs (not a separate cached counter).
 */
export default async function AccountManagerReviewQueuePage() {
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

  const jobIds = await listAccountManagerJobIds(accountManagerId);
  const jobIdSet = new Set(jobIds);
  const submissions =
    jobIds.length === 0
      ? []
      : (await listSubmissions()).filter((row) => jobIdSet.has(row.jobId));

  return (
    <ReviewQueuePageClient
      initialSubmissions={submissions}
      canTransition={roleHasPermission(session.role, "review_candidates")}
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
