import { redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import { JobsPageClient } from "@/features/jobs/components";
import { listJobs, getJobLocations } from "@/features/jobs/services";
import {
  listAccountManagerOptions,
  listClientOptions,
  listPartnerOptions,
} from "@/services/lookups";

async function loadJobsPageData() {
  const session = await getAppSession();

  if (!session) {
    redirect("/unauthorized");
  }

  if (!roleHasPermission(session.role, "view_jobs")) {
    redirect("/forbidden");
  }

  const canManage = roleHasPermission(session.role, "manage_jobs");
  // Admin never allocates — Account Managers only.
  const canAllocate = false;

  const [jobs, clients, accountManagers, partners, locations] =
    await Promise.all([
      listJobs({ includeArchived: true }),
      listClientOptions(),
      listAccountManagerOptions(),
      listPartnerOptions("identity"),
      getJobLocations(),
    ]);

  return {
    jobs,
    clients,
    accountManagers,
    partners,
    locations,
    canManage,
    canAllocate,
  };
}

export default async function AdminJobsPage() {
  const {
    jobs,
    clients,
    accountManagers,
    partners,
    locations,
    canManage,
    canAllocate,
  } = await loadJobsPageData();

  return (
    <JobsPageClient
      initialJobs={jobs}
      clients={clients}
      accountManagers={accountManagers}
      partners={partners}
      locations={locations}
      canManage={canManage}
      canAllocate={canAllocate}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Jobs" },
      ]}
    />
  );
}
