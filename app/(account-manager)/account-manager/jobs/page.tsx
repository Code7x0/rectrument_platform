import { redirect } from "next/navigation";

import {
  getAppSession,
  roleHasPermission,
  resolveAccountManagerScopeId,
} from "@/lib/auth";
import { JobsPageClient } from "@/features/jobs/components";
import { listJobs, getJobLocations } from "@/features/jobs/services";
import { listClients } from "@/features/clients/services";
import {
  listAccountManagerOptions,
  listPartnerOptions,
} from "@/services/lookups";

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

  const [jobs, assignedClients, accountManagers, partners, locations] =
    await Promise.all([
      listJobs({
        includeArchived: true,
        accountManagerId,
      }),
      listClients({ includeArchived: true, accountManagerId }),
      listAccountManagerOptions().then((rows) =>
        rows.filter((row) => row.id === accountManagerId),
      ),
      listPartnerOptions("operational"),
      getJobLocations(),
    ]);

  const clients = assignedClients.map((client) => ({
    id: client.id,
    label: client.name,
    accountManagerId: client.accountManagerId,
  }));

  return (
    <JobsPageClient
      initialJobs={jobs}
      clients={clients}
      accountManagers={accountManagers}
      partners={partners}
      locations={locations}
      canManage={false}
      canAllocate={canAllocate}
      breadcrumbs={[
        { label: "Account Manager", href: "/account-manager" },
        { label: "Jobs" },
      ]}
    />
  );
}
