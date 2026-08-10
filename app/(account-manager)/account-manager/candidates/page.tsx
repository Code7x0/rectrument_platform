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
import { listClients } from "@/features/clients/services";

/**
 * AM Candidates — same source of truth as dashboard Submissions metric:
 * all linked submissions on owned jobs (not a separate cached counter).
 */
export default async function AccountManagerReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{
    submissionId?: string;
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
  const jobId = params.jobId?.trim() || null;
  const status = params.status?.trim() || null;
  const statusGroup = params.statusGroup?.trim() || null;

  const jobIds = await listAccountManagerJobIds(accountManagerId);
  const jobIdSet = new Set(jobIds);
  const [rawSubmissions, ownedClients] = await Promise.all([
    jobIds.length === 0
      ? Promise.resolve([])
      : listSubmissions({ includePartnerIdentity: false }),
    listClients({ includeArchived: true, accountManagerId }),
  ]);

  const codeByClientId = new Map(
    ownedClients.map((client) => [
      client.id,
      client.clientCode?.trim() || null,
    ]),
  );

  const submissions = rawSubmissions
    .filter((row) => jobIdSet.has(row.jobId))
    .map((row) => {
      const code =
        (row.clientId ? codeByClientId.get(row.clientId) : null) ||
        row.clientCode?.trim() ||
        row.jobCode?.split("_")[0]?.trim() ||
        null;
      // AM surfaces use Client ID only — never commercial names or raw rec ids.
      return {
        ...row,
        clientCode: code,
        clientName: code,
      };
    });

  return (
    <ReviewQueuePageClient
      initialSubmissions={submissions}
      initialSubmissionId={submissionId}
      initialJobId={jobId}
      initialStatus={status}
      initialStatusGroup={statusGroup}
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
