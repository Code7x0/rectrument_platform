"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { WorkspaceShell } from "@/features/shared/workspace";
import { Button } from "@/components/ui/button";
import { ClientDialog } from "@/features/clients/components/client-dialog";
import { JobDialog } from "@/features/jobs/components/job-dialog";
import { ClientOverviewTab } from "@/features/clients/workspace/client-overview-tab";
import { ClientJobsTab } from "@/features/clients/workspace/client-jobs-tab";
import { ClientPartnersTab } from "@/features/clients/workspace/client-partners-tab";
import { ClientCandidatesTab } from "@/features/clients/workspace/client-candidates-tab";
import { ActivityDrawer } from "@/features/activity/components/activity-drawer";
import { EntityActivityPanel } from "@/features/activity/components/entity-activity-panel";
import type { TimelineListResult } from "@/features/activity/types";
import type { Allocation } from "@/features/allocations/types";
import type { Client, ClientWorkspaceStats } from "@/features/clients/types";
import type { Job } from "@/features/jobs/types";
import type { Submission } from "@/features/submissions/types";
import type { LookupOption } from "@/services/lookups";
import type { UserRole } from "@/types";

export type ClientWorkspaceTabId =
  | "overview"
  | "jobs"
  | "partners"
  | "candidates"
  | "activity";

interface ClientWorkspacePageClientProps {
  client: Client;
  stats: ClientWorkspaceStats;
  jobs: Job[];
  allocations: Allocation[];
  submissions: Submission[];
  tab: ClientWorkspaceTabId;
  accountManagers: LookupOption[];
  clients: LookupOption[];
  partners: LookupOption[];
  canUpdate: boolean;
  canManageJobs: boolean;
  canAllocate: boolean;
  /** Unassign partners from jobs under this client. */
  canManagePartners?: boolean;
  viewerUserId?: string | null;
  viewerRole?: UserRole | null;
  activityTimeline: TimelineListResult;
  basePath: "/admin/clients" | "/account-manager/clients";
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function ClientWorkspacePageClient({
  client,
  stats,
  jobs,
  allocations,
  submissions,
  tab,
  accountManagers,
  clients,
  partners,
  canUpdate,
  canManageJobs,
  canAllocate,
  canManagePartners = false,
  viewerUserId = null,
  viewerRole = null,
  activityTimeline,
  basePath,
  breadcrumbs,
}: ClientWorkspacePageClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const isAmPath = basePath === "/account-manager/clients";

  const tabs = [
    { id: "overview", label: "Overview", href: `${basePath}/${client.id}` },
    {
      id: "jobs",
      label: `Jobs (${stats.jobCount})`,
      href: `${basePath}/${client.id}?tab=jobs`,
    },
    {
      id: "partners",
      label: "Talent Partners",
      href: `${basePath}/${client.id}?tab=partners`,
    },
    {
      id: "candidates",
      label: "Candidates",
      href: `${basePath}/${client.id}?tab=candidates`,
    },
    {
      id: "activity",
      label: "Activity",
      href: `${basePath}/${client.id}?tab=activity`,
    },
  ];

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <WorkspaceShell
        title={
          isAmPath
            ? (client.clientCode?.trim() || "Client")
            : client.name
        }
        subtitle={
          isAmPath
            ? (client.industry ?? undefined)
            : [client.clientCode, client.industry].filter(Boolean).join(" · ") ||
              undefined
        }
        tabs={tabs}
        activeTab={tab}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ActivityDrawer
              entityRef={{ kind: "client", id: client.id }}
              title={`${isAmPath ? (client.clientCode ?? "Client") : client.name} activity`}
              initial={activityTimeline}
            />
            {canManageJobs && client.status !== "archived" ? (
              <Button type="button" onClick={() => setCreateJobOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Job
              </Button>
            ) : null}
            {canUpdate && client.status !== "archived" ? (
              <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit Client
              </Button>
            ) : null}
          </div>
        }
      >
        {tab === "overview" ? (
          <ClientOverviewTab
            client={client}
            stats={stats}
            hideClientName={isAmPath}
          />
        ) : null}
        {tab === "jobs" ? (
          <ClientJobsTab
            clientId={client.id}
            jobs={jobs}
            clients={clients}
            accountManagers={accountManagers}
            partners={partners}
            canManageJobs={canManageJobs}
            canAllocate={canAllocate}
            canManagePartners={canManagePartners}
            lockAccountManager={isAmPath}
          />
        ) : null}
        {tab === "partners" ? (
          <ClientPartnersTab
            allocations={allocations}
            canUnassign={canManagePartners || canAllocate}
            viewerUserId={viewerUserId}
            viewerRole={viewerRole}
          />
        ) : null}
        {tab === "candidates" ? (
          <ClientCandidatesTab submissions={submissions} />
        ) : null}
        {tab === "activity" ? (
          <EntityActivityPanel
            entityRef={{ kind: "client", id: client.id }}
            initial={activityTimeline}
            showFilters
          />
        ) : null}
      </WorkspaceShell>

      <ClientDialog
        open={editOpen}
        mode="edit"
        client={client}
        accountManagers={accountManagers}
        lockAccountManager={isAmPath}
        hideClientName={isAmPath}
        onOpenChange={setEditOpen}
        onCompleted={() => router.refresh()}
      />

      <JobDialog
        open={createJobOpen}
        mode="create"
        clients={clients}
        accountManagers={accountManagers}
        lockAccountManager={isAmPath}
        defaultClientId={client.id}
        lockClient
        onOpenChange={setCreateJobOpen}
        onCompleted={() => router.refresh()}
      />
    </ContentContainer>
  );
}
