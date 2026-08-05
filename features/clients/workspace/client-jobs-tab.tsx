"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { ArchiveDialog } from "@/components/shared/archive-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { archiveJobAction } from "@/features/jobs/actions/jobs.actions";
import { JobDialog } from "@/features/jobs/components/job-dialog";
import { JobDrawer } from "@/features/jobs/components/job-drawer";
import { JobTable } from "@/features/jobs/components/job-table";
import {
  AllocatePartnerDialog,
  JobAssignedPartnersDialog,
} from "@/features/allocations/components";
import type { Job } from "@/features/jobs/types";
import type { LookupOption } from "@/services/lookups";
import { signalLiveDataChange } from "@/lib/live-sync";

interface ClientJobsTabProps {
  clientId: string;
  jobs: Job[];
  clients: LookupOption[];
  accountManagers: LookupOption[];
  partners: LookupOption[];
  canManageJobs: boolean;
  canAllocate: boolean;
  /** View + unassign partners on owned jobs. */
  canManagePartners?: boolean;
  lockAccountManager?: boolean;
}

/**
 * Reuses Jobs feature components — filtered by client upstream.
 */
export function ClientJobsTab({
  clientId,
  jobs,
  clients,
  accountManagers,
  partners,
  canManageJobs,
  canAllocate,
  canManagePartners = false,
  lockAccountManager = false,
}: ClientJobsTabProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewJob, setViewJob] = useState<Job | null>(null);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [allocateJob, setAllocateJob] = useState<Job | null>(null);
  const [partnersJob, setPartnersJob] = useState<Job | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Job | null>(null);
  const [archiving, setArchiving] = useState(false);

  function refresh() {
    signalLiveDataChange();
    startTransition(() => router.refresh());
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

  const createDialog = canManageJobs ? (
    <JobDialog
      open={createOpen}
      mode="create"
      clients={clients}
      accountManagers={accountManagers}
      lockAccountManager={lockAccountManager}
      defaultClientId={clientId}
      lockClient
      onOpenChange={setCreateOpen}
      onCompleted={refresh}
    />
  ) : null;

  if (jobs.length === 0) {
    return (
      <>
        <EmptyState
          title="No jobs for this client"
          description={
            canManageJobs
              ? "Create a job for this account to start hiring."
              : "Create a job from the Jobs module and link it to this client."
          }
          action={
            canManageJobs ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Job
              </Button>
            ) : undefined
          }
        />
        {createDialog}
      </>
    );
  }

  return (
    <>
      {canManageJobs ? (
        <div className="mb-3 flex justify-end">
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Job
          </Button>
        </div>
      ) : null}

      <JobTable
        jobs={jobs}
        loading={pending}
        canManage={canManageJobs}
        canAllocate={canAllocate}
        canViewPartners={canManagePartners || canAllocate}
        onView={setViewJob}
        onEdit={setEditJob}
        onArchive={setArchiveTarget}
        onAllocate={setAllocateJob}
        onViewPartners={setPartnersJob}
        emptyAction={
          canManageJobs ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create Job
            </Button>
          ) : undefined
        }
      />

      <JobDrawer
        job={viewJob}
        open={Boolean(viewJob)}
        hideAccountManager={lockAccountManager}
        onOpenChange={(open) => {
          if (!open) {
            setViewJob(null);
          }
        }}
      />

      {createDialog}

      <JobDialog
        open={Boolean(editJob)}
        mode="edit"
        job={editJob}
        clients={clients}
        accountManagers={accountManagers}
        lockAccountManager={lockAccountManager}
        onOpenChange={(open) => {
          if (!open) {
            setEditJob(null);
          }
        }}
        onCompleted={refresh}
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
    </>
  );
}
