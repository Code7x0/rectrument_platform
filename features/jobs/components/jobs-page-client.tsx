"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { ArchiveDialog } from "@/components/shared/archive-dialog";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  AssignAccountManagerDialog,
  type AssignAmTarget,
} from "@/features/account-managers/components/assign-account-manager-dialog";
import { AllocatePartnerDialog, JobAssignedPartnersDialog } from "@/features/allocations/components";
import { archiveJobAction } from "@/features/jobs/actions/jobs.actions";
import { JobDialog } from "@/features/jobs/components/job-dialog";
import { JobDrawer } from "@/features/jobs/components/job-drawer";
import { JobFilters } from "@/features/jobs/components/job-filters";
import { JobTable } from "@/features/jobs/components/job-table";
import type { Job, JobListFilters } from "@/features/jobs/types";
import type { LookupOption } from "@/services/lookups";
import { signalLiveDataChange } from "@/lib/live-sync";

interface JobsPageClientProps {
  initialJobs: Job[];
  clients: LookupOption[];
  accountManagers: LookupOption[];
  partners: LookupOption[];
  locations: string[];
  canManage: boolean;
  canAllocate: boolean;
  /** View + unassign partners on a job (Admin / SA / AM with archive). */
  canManagePartners?: boolean;
  canDelete?: boolean;
  hideAccountManager?: boolean;
  submittedByJobId?: Record<string, number>;
  submittedProfilesBasePath?: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

function applyClientFilters(jobs: Job[], filters: JobListFilters): Job[] {
  return jobs.filter((job) => {
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      const matches =
        job.jobCode.toLowerCase().includes(q) ||
        job.title.toLowerCase().includes(q) ||
        (job.clientName?.toLowerCase().includes(q) ?? false);
      if (!matches) {
        return false;
      }
    }

    if (
      filters.status &&
      filters.status !== "all" &&
      job.status !== filters.status
    ) {
      return false;
    }

    if (
      filters.clientId &&
      filters.clientId !== "all" &&
      job.clientId !== filters.clientId
    ) {
      return false;
    }

    if (
      filters.priority &&
      filters.priority !== "all" &&
      job.priority !== filters.priority
    ) {
      return false;
    }

    if (
      filters.employmentType &&
      filters.employmentType !== "all" &&
      job.employmentType !== filters.employmentType
    ) {
      return false;
    }

    if (
      filters.location &&
      filters.location !== "all" &&
      job.location !== filters.location
    ) {
      return false;
    }

    if (!filters.includeArchived && filters.status !== "archived") {
      if (job.status === "archived") {
        return false;
      }
    }

    return true;
  });
}

export function JobsPageClient({
  initialJobs,
  clients,
  accountManagers,
  partners,
  locations,
  canManage,
  canAllocate,
  canManagePartners = false,
  canDelete = false,
  hideAccountManager = false,
  submittedByJobId = {},
  submittedProfilesBasePath,
  breadcrumbs,
}: JobsPageClientProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<JobListFilters>({
    status: "all",
    clientId: "all",
    priority: "all",
    location: "all",
    employmentType: "all",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [viewJob, setViewJob] = useState<Job | null>(null);
  const [allocateJob, setAllocateJob] = useState<Job | null>(null);
  const [partnersJob, setPartnersJob] = useState<Job | null>(null);
  const [assignAmOpen, setAssignAmOpen] = useState(false);
  const [assignAmTarget, setAssignAmTarget] = useState<AssignAmTarget>(null);
  const [archiveTarget, setArchiveTarget] = useState<Job | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [pending, startTransition] = useTransition();

  const filteredJobs = useMemo(
    () => applyClientFilters(initialJobs, filters),
    [initialJobs, filters],
  );

  function refresh() {
    signalLiveDataChange();
    startTransition(() => {
      router.refresh();
    });
  }

  async function confirmArchive() {
    if (!archiveTarget) {
      return;
    }

    setArchiving(true);
    try {
      const result = await archiveJobAction(archiveTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Job archived");
      setArchiveTarget(null);
      refresh();
    } finally {
      setArchiving(false);
    }
  }

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="Jobs"
        description={
          canManage
            ? hideAccountManager
              ? "Create and update jobs for the accounts you own."
              : "Create jobs, assign Account Managers, and manage hiring requirements across clients."
            : canAllocate
              ? "Jobs for your clients — Allocate partners, or open Partners to unassign them."
              : "Hiring requirements you can view."
        }
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              {!hideAccountManager ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAssignAmTarget(null);
                    setAssignAmOpen(true);
                  }}
                >
                  Assign Account Manager
                </Button>
              ) : null}
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Job
              </Button>
            </div>
          ) : null
        }
      />

      <JobFilters
        filters={filters}
        clients={clients}
        locations={locations}
        onChange={setFilters}
      />

      <JobTable
        jobs={filteredJobs}
        canManage={canManage}
        canAllocate={canAllocate}
        canViewPartners={canManagePartners || canAllocate}
        hideAccountManager={hideAccountManager}
        submittedByJobId={submittedByJobId}
        submittedProfilesBasePath={submittedProfilesBasePath}
        emptyAction={
          canManage ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create Job
            </Button>
          ) : undefined
        }
        onView={setViewJob}
        onEdit={setEditJob}
        onArchive={setArchiveTarget}
        onAllocate={setAllocateJob}
        onViewPartners={setPartnersJob}
        onAssignAm={
          canManage && !hideAccountManager
            ? (job) => {
                setAssignAmTarget({
                  kind: "job",
                  jobId: job.id,
                  jobLabel: job.jobCode
                    ? `${job.jobCode} — ${job.title}`
                    : job.title,
                  clientId: job.clientId,
                  clientLabel: job.clientName,
                  accountManagerId: job.accountManagerId,
                  accountManagerIds: job.accountManagerIds,
                });
                setAssignAmOpen(true);
              }
            : undefined
        }
      />

      <JobDialog
        open={createOpen}
        mode="create"
        clients={clients}
        accountManagers={accountManagers}
        lockAccountManager={hideAccountManager}
        onOpenChange={setCreateOpen}
        onCompleted={refresh}
      />

      <JobDialog
        open={Boolean(editJob)}
        mode="edit"
        job={editJob}
        clients={clients}
        accountManagers={accountManagers}
        canDelete={canDelete}
        lockAccountManager={hideAccountManager}
        onOpenChange={(open) => {
          if (!open) {
            setEditJob(null);
          }
        }}
        onCompleted={refresh}
      />

      <JobDrawer
        job={viewJob}
        open={Boolean(viewJob)}
        hideAccountManager={hideAccountManager}
        onOpenChange={(open) => {
          if (!open) {
            setViewJob(null);
          }
        }}
      />

      <AllocatePartnerDialog
        open={Boolean(allocateJob)}
        job={allocateJob}
        partners={partners}
        onOpenChange={(open) => {
          if (!open) {
            setAllocateJob(null);
          }
        }}
        onCompleted={refresh}
      />

      <JobAssignedPartnersDialog
        open={Boolean(partnersJob)}
        job={partnersJob}
        canUnassign={canManagePartners || canAllocate}
        onOpenChange={(open) => {
          if (!open) {
            setPartnersJob(null);
          }
        }}
        onCompleted={refresh}
      />

      <AssignAccountManagerDialog
        open={assignAmOpen}
        onOpenChange={(open) => {
          setAssignAmOpen(open);
          if (!open) {
            setAssignAmTarget(null);
          }
        }}
        clients={clients}
        accountManagers={accountManagers}
        target={assignAmTarget}
        onCompleted={refresh}
      />

      <ArchiveDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
          }
        }}
        entityName={archiveTarget?.title ?? "this job"}
        entityLabel="job"
        loading={archiving}
        onConfirm={confirmArchive}
      />
    </ContentContainer>
  );
}
