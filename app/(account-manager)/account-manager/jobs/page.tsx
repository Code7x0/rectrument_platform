import { redirect } from "next/navigation";

import {
  getAppSession,
  roleHasPermission,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import { JobsPageClient } from "@/features/jobs/components";
import { listJobs, getJobLocations } from "@/features/jobs/services";
import { listClients } from "@/features/clients/services";
import { listPartnerOptions } from "@/services/lookups";

export default async function AccountManagerJobsPage() {
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

  const [jobs, assignedClients, accountManagers, partners, locations] =
    await Promise.all([
      listJobs({
        includeArchived: true,
        accountManagerId,
      }),
      listClients({ includeArchived: true, accountManagerId }),
      Promise.resolve([{ id: accountManagerId, label: "You" }]),
      listPartnerOptions("operational"),
      getJobLocations(),
    ]);

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
  }));

  // AM surfaces use Client ID only — never commercial client names.
  const jobsForAm = jobs.map((job) => ({
    ...job,
    clientName:
      (job.clientId ? codeByClientId.get(job.clientId) : null) ??
      job.jobCode?.split("_")[0] ??
      null,
  }));

  return (
    <JobsPageClient
      initialJobs={jobsForAm}
      clients={clients}
      accountManagers={accountManagers}
      partners={partners}
      locations={locations}
      canManage={false}
      canAllocate={canAllocate}
      canManagePartners={canManagePartners}
      breadcrumbs={[
        { label: "Account Manager", href: "/account-manager" },
        { label: "Jobs" },
      ]}
    />
  );
}
