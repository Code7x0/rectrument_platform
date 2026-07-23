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
import { AllocatePartnerDialog } from "@/features/allocations/components";
import { archiveJobAction } from "@/features/jobs/actions/jobs.actions";
import { JobDialog } from "@/features/jobs/components/job-dialog";
import { JobDrawer } from "@/features/jobs/components/job-drawer";
import { JobFilters } from "@/features/jobs/components/job-filters";
import { JobTable } from "@/features/jobs/components/job-table";
import type { Job, JobListFilters } from "@/features/jobs/types";
import type { LookupOption } from "@/services/lookups";

interface JobsPageClientProps {
  initialJobs: Job[];
  clients: LookupOption[];
  accountManagers: LookupOption[];
  partners: LookupOption[];
  locations: string[];
  canManage: boolean;
  canAllocate: boolean;
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
  const [archiveTarget, setArchiveTarget] = useState<Job | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [pending, startTransition] = useTransition();

  const filteredJobs = useMemo(
    () => applyClientFilters(initialJobs, filters),
    [initialJobs, filters],
  );

  function refresh() {
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
        description="Manage hiring requirements across clients."
        actions={
          canManage ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Job
            </Button>
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
        loading={pending}
        canManage={canManage}
        canAllocate={canAllocate}
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
      />

      <JobDialog
        open={createOpen}
        mode="create"
        clients={clients}
        accountManagers={accountManagers}
        onOpenChange={setCreateOpen}
        onCompleted={refresh}
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

      <JobDrawer
        job={viewJob}
        open={Boolean(viewJob)}
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
