import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import {
  getAppSession,
  roleHasPermission,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import { ReviewQueuePageClient } from "@/features/tasks/components";
import { listSubmissions } from "@/features/submissions/services";
import { listClients } from "@/features/clients/services";
import { listJobs } from "@/features/jobs/services";

/**
 * AM Candidates — same ownership source as Jobs / dashboard:
 * submissions on jobs visible to this Account Manager (co-owners included).
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

  const [jobs, ownedClients, rawSubmissions] = await Promise.all([
    listJobs({
      accountManagerId,
      includeArchived: true,
    }),
    listClients({ includeArchived: true, accountManagerId }),
    listSubmissions({ includePartnerIdentity: false }),
  ]);

  const jobIdSet = new Set(jobs.map((job) => job.id));
  const jobMetaById = new Map(
    jobs.map((job) => [
      job.id,
      {
        clientId: job.clientId,
        clientCode:
          job.clientCode?.trim() ||
          job.jobCode?.split("_")[0]?.trim() ||
          null,
      },
    ]),
  );

  const codeByClientId = new Map(
    ownedClients.map((client) => [
      client.id,
      client.clientCode?.trim() || null,
    ]),
  );

  const clientFilterOptionsMap = new Map<string, string>();
  for (const client of ownedClients) {
    const label = client.clientCode?.trim();
    if (client.id && label) {
      clientFilterOptionsMap.set(client.id, label);
    }
  }
  // Jobs can surface a client code even if Client ID was blank on the row map.
  for (const job of jobs) {
    if (!job.clientId || clientFilterOptionsMap.has(job.clientId)) {
      continue;
    }
    const label =
      job.clientCode?.trim() ||
      job.jobCode?.split("_")[0]?.trim() ||
      null;
    if (label) {
      clientFilterOptionsMap.set(job.clientId, label);
    }
  }
  const clientFilterOptions = [...clientFilterOptionsMap.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const submissions = rawSubmissions
    .filter((row) => jobIdSet.has(row.jobId))
    .map((row) => {
      const jobMeta = jobMetaById.get(row.jobId);
      const clientId = row.clientId || jobMeta?.clientId || null;
      const code =
        (clientId ? codeByClientId.get(clientId) : null) ||
        row.clientCode?.trim() ||
        jobMeta?.clientCode ||
        row.jobCode?.split("_")[0]?.trim() ||
        null;
      // AM surfaces use Client ID only — never commercial names or raw rec ids.
      return {
        ...row,
        clientId,
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
      clientFilterOptions={clientFilterOptions}
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
