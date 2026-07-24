"use client";

import { useMemo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { JobActions } from "@/features/jobs/components/job-actions";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_PRIORITY_LABELS,
  type Job,
} from "@/features/jobs/types";
import { formatDate } from "@/lib/utils";

interface JobTableProps {
  jobs: Job[];
  loading?: boolean;
  canManage: boolean;
  canAllocate?: boolean;
  emptyAction?: ReactNode;
  onView: (job: Job) => void;
  onEdit: (job: Job) => void;
  onArchive: (job: Job) => void;
  onAllocate?: (job: Job) => void;
}

export function JobTable({
  jobs,
  loading = false,
  canManage,
  canAllocate = false,
  emptyAction,
  onView,
  onEdit,
  onArchive,
  onAllocate,
}: JobTableProps) {
  const columns = useMemo<DataTableColumn<Job>[]>(
    () => [
      {
        id: "jobCode",
        header: "Job ID",
        cell: (job) => (
          <span className="font-medium text-[#0F172A]">
            {job.jobCode || "—"}
          </span>
        ),
      },
      {
        id: "title",
        header: "Job Title",
        cell: (job) => <span className="text-[#0F172A]">{job.title}</span>,
      },
      {
        id: "client",
        header: "Client",
        className: "text-[#64748B]",
        cell: (job) => job.clientName ?? "—",
      },
      {
        id: "accountManager",
        header: "Account Manager",
        className: "text-[#64748B]",
        cell: (job) => job.accountManagerName ?? "—",
      },
      {
        id: "hiringManager",
        header: "Hiring Manager",
        className: "text-[#64748B]",
        cell: (job) => job.hiringManager ?? "—",
      },
      {
        id: "location",
        header: "Location",
        className: "text-[#64748B]",
        cell: (job) => job.location ?? "—",
      },
      {
        id: "employmentType",
        header: "Employment Type",
        className: "text-[#64748B]",
        cell: (job) =>
          job.employmentType
            ? EMPLOYMENT_TYPE_LABELS[job.employmentType]
            : "—",
      },
      {
        id: "experience",
        header: "Experience",
        className: "text-[#64748B]",
        cell: (job) => job.experience ?? "—",
      },
      {
        id: "priority",
        header: "Priority",
        className: "text-[#64748B]",
        cell: (job) =>
          job.priority ? JOB_PRIORITY_LABELS[job.priority] : "—",
      },
      {
        id: "openPositions",
        header: "Open Positions",
        className: "text-[#64748B]",
        cell: (job) => job.openPositions,
      },
      {
        id: "status",
        header: "Status",
        cell: (job) => <JobStatusBadge status={job.status} />,
      },
      {
        id: "createdAt",
        header: "Created Date",
        className: "text-[#64748B]",
        cell: (job) => (job.createdAt ? formatDate(job.createdAt) : "—"),
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        cell: (job) => (
          <JobActions
            job={job}
            canManage={canManage}
            canAllocate={canAllocate}
            onView={onView}
            onEdit={onEdit}
            onArchive={onArchive}
            onAllocate={onAllocate}
          />
        ),
      },
    ],
    [canAllocate, canManage, onAllocate, onArchive, onEdit, onView],
  );

  return (
    <DataTable
      columns={columns}
      data={jobs}
      getRowId={(job) => job.id}
      loading={loading}
      emptyTitle="No Jobs Found"
      emptyDescription="Try adjusting filters or create a new job requirement."
      emptyAction={
        emptyAction ??
        (canManage ? (
          <Button type="button" disabled>
            Create Job
          </Button>
        ) : undefined)
      }
    />
  );
}
