import { notFound, redirect } from "next/navigation";

import { getAppSession, roleHasPermission } from "@/lib/auth";
import {
  ClientWorkspacePageClient,
  type ClientWorkspaceTabId,
  loadClientWorkspacePipeline,
} from "@/features/clients/workspace";
import {
  getClientById,
  getClientWorkspaceStats,
} from "@/features/clients/services";
import { listJobs } from "@/features/jobs/services";
import {
  listAccountManagerOptions,
  listClientOptions,
  listPartnerOptions,
} from "@/services/lookups";

const TABS: ClientWorkspaceTabId[] = [
  "overview",
  "jobs",
  "partners",
  "candidates",
  "activity",
];

function parseTab(value: string | undefined): ClientWorkspaceTabId {
  if (value && TABS.includes(value as ClientWorkspaceTabId)) {
    return value as ClientWorkspaceTabId;
  }
  return "overview";
}

export default async function AdminClientWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.role, "manage_clients")) {
    redirect("/forbidden");
  }

  const { clientId } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = parseTab(tabParam);

  const client = await getClientById(clientId);
  if (!client) {
    notFound();
  }

  const [stats, jobs, accountManagers, clients, partners] = await Promise.all([
    getClientWorkspaceStats(clientId),
    listJobs({ clientId, includeArchived: true }),
    listAccountManagerOptions(),
    listClientOptions(),
    listPartnerOptions(),
  ]);

  const [{ allocations, submissions }, activityTimeline] = await Promise.all([
    loadClientWorkspacePipeline(jobs),
    import("@/features/activity/services").then(({ getEntityTimeline }) =>
      getEntityTimeline(
        session,
        { kind: "client", id: clientId },
        { page: 1, pageSize: 40 },
      ),
    ),
  ]);

  return (
    <ClientWorkspacePageClient
      client={client}
      stats={stats}
      jobs={jobs}
      allocations={allocations}
      submissions={submissions}
      tab={tab}
      accountManagers={accountManagers}
      clients={clients}
      partners={partners}
      activityTimeline={activityTimeline}
      canUpdate={roleHasPermission(session.role, "manage_clients")}
      canManageJobs={roleHasPermission(session.role, "manage_jobs")}
      canAllocate={false}
      basePath="/admin/clients"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Clients", href: "/admin/clients" },
        { label: client.name },
      ]}
    />
  );
}
