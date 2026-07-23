import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { JobsPageClient } from "@/features/jobs/components";
import { listJobs, getJobLocations } from "@/features/jobs/services";
import {
  listAccountManagerOptions,
  listClientOptions,
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

  const canAllocate = roleHasPermission(session.role, "manage_allocations");

  const [jobs, clients, accountManagers, partners, locations] =
    await Promise.all([
      listJobs({
        includeArchived: true,
        accountManagerId: session.userId,
      }),
      listClientOptions(),
      listAccountManagerOptions(),
      listPartnerOptions("operational"),
      getJobLocations(),
    ]);

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
