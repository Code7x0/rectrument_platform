import { redirect } from "next/navigation";

import { getAppSession, isAdmin, roleHasPermission } from "@/lib/auth";
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
  const canAllocate = roleHasPermission(session.role, "manage_allocations");

  const [jobs, clients, accountManagers, partners, locations] =
    await Promise.all([
      listJobs({ includeArchived: true }),
      listClientOptions(),
      listAccountManagerOptions(),
      listPartnerOptions("identity"),
      getJobLocations(),
    ]);

  return {
    session,
    jobs,
    clients,
    accountManagers,
    partners,
    locations,
    canManage,
    canAllocate,
    canDelete: isAdmin(session),
  };
}

export default async function AdminJobsPage() {
  const {
    session,
    jobs,
    clients,
    accountManagers,
    partners,
    locations,
    canManage,
    canAllocate,
    canDelete,
  } = await loadJobsPageData();

  const homeLabel = session.role === "super_admin" ? "Super Admin" : "Admin";
  const homeHref = session.role === "super_admin" ? "/super-admin" : "/admin";

  return (
    <JobsPageClient
      initialJobs={jobs}
      clients={clients}
      accountManagers={accountManagers}
      partners={partners}
      locations={locations}
      canManage={canManage}
      canAllocate={canAllocate}
      canDelete={canDelete}
      breadcrumbs={[
        { label: homeLabel, href: homeHref },
        { label: "Jobs" },
      ]}
    />
  );
}
