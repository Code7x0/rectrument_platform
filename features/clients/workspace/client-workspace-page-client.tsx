"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { WorkspaceShell } from "@/features/shared/workspace";
import { Button } from "@/components/ui/button";
import { ClientDialog } from "@/features/clients/components/client-dialog";
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
  activityTimeline,
  basePath,
  breadcrumbs,
}: ClientWorkspacePageClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

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
        title={client.name}
        subtitle={client.industry}
        tabs={tabs}
        activeTab={tab}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ActivityDrawer
              entityRef={{ kind: "client", id: client.id }}
              title={`${client.name} activity`}
              initial={activityTimeline}
            />
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
          <ClientOverviewTab client={client} stats={stats} />
        ) : null}
        {tab === "jobs" ? (
          <ClientJobsTab
            jobs={jobs}
            clients={clients}
            accountManagers={accountManagers}
            partners={partners}
            canManageJobs={canManageJobs}
            canAllocate={canAllocate}
          />
        ) : null}
        {tab === "partners" ? (
          <ClientPartnersTab allocations={allocations} />
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
        onOpenChange={setEditOpen}
        onCompleted={() => router.refresh()}
      />
    </ContentContainer>
  );
}
