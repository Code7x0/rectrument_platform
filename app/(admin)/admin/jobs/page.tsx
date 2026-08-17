import { redirect } from "next/navigation";

import { getAppSession, isAdmin, roleHasPermission } from "@/lib/auth";
import { JobsPageClient } from "@/features/jobs/components";
import { listJobs } from "@/features/jobs/services";
import { listSubmissions } from "@/features/submissions/services";
import {
  listAccountManagerOptions,
  listClientOptions,
  listPartnerOptions,
} from "@/services/lookups";

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
  const canManagePartners = roleHasPermission(
    session.role,
    "archive_allocations",
  );

  const [jobs, clients, accountManagers, partners, submissions] =
    await Promise.all([
      listJobs({ includeArchived: true }),
      listClientOptions(),
      listAccountManagerOptions(),
      listPartnerOptions("identity"),
      listSubmissions({ enrich: false }),
    ]);
  const locations = locationsFromJobs(jobs);

  const submittedByJobId: Record<string, number> = {};
  for (const row of submissions) {
    submittedByJobId[row.jobId] = (submittedByJobId[row.jobId] ?? 0) + 1;
  }

  return {
    session,
    jobs,
    clients,
    accountManagers,
    partners,
    locations,
    submittedByJobId,
    canManage,
    canAllocate,
    canManagePartners,
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
    canManagePartners,
    canDelete,
    submittedByJobId,
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
      canManagePartners={canManagePartners}
      canDelete={canDelete}
      submittedByJobId={submittedByJobId}
      submittedProfilesBasePath="/admin/candidates"
      breadcrumbs={[
        { label: homeLabel, href: homeHref },
        { label: "Jobs" },
      ]}
    />
  );
}
