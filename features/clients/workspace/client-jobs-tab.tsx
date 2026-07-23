"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ArchiveDialog } from "@/components/shared/archive-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { archiveJobAction } from "@/features/jobs/actions/jobs.actions";
import { JobDialog } from "@/features/jobs/components/job-dialog";
import { JobDrawer } from "@/features/jobs/components/job-drawer";
import { JobTable } from "@/features/jobs/components/job-table";
import { AllocatePartnerDialog } from "@/features/allocations/components";
import type { Job } from "@/features/jobs/types";
import type { LookupOption } from "@/services/lookups";

interface ClientJobsTabProps {
  jobs: Job[];
  clients: LookupOption[];
  accountManagers: LookupOption[];
  partners: LookupOption[];
  canManageJobs: boolean;
  canAllocate: boolean;
}

/**
 * Reuses Jobs feature components — filtered by client upstream.
 */
export function ClientJobsTab({
  jobs,
  clients,
  accountManagers,
  partners,
  canManageJobs,
  canAllocate,
}: ClientJobsTabProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [viewJob, setViewJob] = useState<Job | null>(null);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [allocateJob, setAllocateJob] = useState<Job | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Job | null>(null);
  const [archiving, setArchiving] = useState(false);

  function refresh() {
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

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No jobs for this client"
        description="Create a job from the Jobs module and link it to this client."
      />
    );
  }

  return (
    <>
      <JobTable
        jobs={jobs}
        loading={pending}
        canManage={canManageJobs}
        canAllocate={canAllocate}
        onView={setViewJob}
        onEdit={setEditJob}
        onArchive={setArchiveTarget}
        onAllocate={setAllocateJob}
      />

      <JobDrawer
        job={viewJob}
        open={Boolean(viewJob)}
        onOpenChange={(open) => {
          if (!open) {
            setViewJob(null);
          }
        }}
      />

      <JobDialog
        open={Boolean(editJob)}
        mode="edit"
        job={editJob}
        clients={clients}
        accountManagers={accountManagers}
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
