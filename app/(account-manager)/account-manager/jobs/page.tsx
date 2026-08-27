import { redirect } from "next/navigation";

import {
  getAppSession,
  roleHasPermission,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import { JobsPageClient } from "@/features/jobs/components";
import { listJobs } from "@/features/jobs/services";
import { listClients } from "@/features/clients/services";
import { listSubmissions } from "@/features/submissions/services";
import { listPartnerOptions, listAccountManagerOptions } from "@/services/lookups";

function locationsFromJobs(
  jobs: Array<{ location?: string | null }>,
): string[] {
  const locations = new Set<string>();
  for (const job of jobs) {
    if (job.location) {
      locations.add(job.location);
    }
  }
  return Array.from(locations).sort((a, b) => a.localeCompare(b));
}

export default async function AccountManagerJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (!roleHasPermission(session.role, "view_jobs")) {
    redirect("/forbidden");
  }

  const accountManagerId = resolveAccountManagerScopeId(session);
  if (!accountManagerId) {
    redirect("/unauthorized");
  }

  const canAllocate = roleHasPermission(session.role, "manage_allocations");
  const canManagePartners = roleHasPermission(
    session.role,
    "archive_allocations",
  );
  const { jobId: jobIdParam } = await searchParams;
  const initialJobId = jobIdParam?.trim() || null;

  const [jobs, assignedClients, allAccountManagers, partners, submissions] =
    await Promise.all([
      listJobs({
        includeArchived: true,
        accountManagerId,
      }),
      listClients({ includeArchived: true, accountManagerId }),
      listAccountManagerOptions(),
      listPartnerOptions("operational"),
      listSubmissions({ enrich: false }),
    ]);
  const locations = locationsFromJobs(jobs);

  const coOwnerIds = new Set<string>();
  for (const client of assignedClients) {
    for (const id of client.accountManagerIds ?? []) {
      coOwnerIds.add(id);
    }
    if (client.accountManagerId) {
      coOwnerIds.add(client.accountManagerId);
    }
  }
  const accountManagers = allAccountManagers.filter((am) =>
    coOwnerIds.has(am.id),
  );

  const codeByClientId = new Map(
    assignedClients.map((client) => [
      client.id,
      client.clientCode?.trim() || null,
    ]),
  );

  const clients = assignedClients.map((client) => ({
    id: client.id,
    label: client.clientCode?.trim() || client.id,
    accountManagerId: client.accountManagerId,
    accountManagerIds:
      client.accountManagerIds?.length > 0
        ? client.accountManagerIds
        : client.accountManagerId
          ? [client.accountManagerId]
          : [],
  }));

  // AM surfaces use Client ID only — never commercial client names.
  const jobsForAm = jobs.map((job) => ({
    ...job,
    clientName:
      (job.clientId ? codeByClientId.get(job.clientId) : null) ??
      job.jobCode?.split("_")[0] ??
      null,
  }));

  const jobIdSet = new Set(jobs.map((job) => job.id));
  const submittedByJobId: Record<string, number> = {};
  for (const row of submissions) {
    if (!jobIdSet.has(row.jobId)) {
      continue;
    }
    submittedByJobId[row.jobId] = (submittedByJobId[row.jobId] ?? 0) + 1;
  }

  return (
    <JobsPageClient
      initialJobs={jobsForAm}
      clients={clients}
      accountManagers={accountManagers}
      partners={partners}
      locations={locations}
      canManage={roleHasPermission(session.role, "manage_jobs")}
      canAllocate={canAllocate}
      canManagePartners={canManagePartners}
      hideAccountManager
      optionalAmAssignment
      submittedByJobId={submittedByJobId}
      submittedProfilesBasePath="/account-manager/candidates"
      initialJobId={initialJobId}
      breadcrumbs={[
        { label: "Account Manager", href: "/account-manager" },
        { label: "Jobs" },
      ]}
    />
  );
}
