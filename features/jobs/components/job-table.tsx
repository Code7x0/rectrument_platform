"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { FilePreviewLink } from "@/components/shared/file-preview-link";
import { JobActions } from "@/features/jobs/components/job-actions";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { deriveJobWorkMode } from "@/features/jobs/lib/work-mode";
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
  canViewPartners?: boolean;
  hideAccountManager?: boolean;
  submittedByJobId?: Record<string, number>;
  /** Base path for submitted-profile links (e.g. /account-manager/candidates). */
  submittedProfilesBasePath?: string;
  emptyAction?: ReactNode;
  onView: (job: Job) => void;
  onEdit: (job: Job) => void;
  onArchive: (job: Job) => void;
  onAllocate?: (job: Job) => void;
  onAssignAm?: (job: Job) => void;
  onViewPartners?: (job: Job) => void;
}

function jobDescriptionDoc(job: Job) {
  return (
    job.documents.find((doc) => doc.label === "Job Description") ??
    job.documents[0] ??
    null
  );
}

export function JobTable({
  jobs,
  loading = false,
  canManage,
  canAllocate = false,
  canViewPartners = false,
  hideAccountManager = false,
  submittedByJobId = {},
  submittedProfilesBasePath,
  emptyAction,
  onView,
  onEdit,
  onArchive,
  onAllocate,
  onAssignAm,
  onViewPartners,
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
        cell: (job) => {
          const jd = jobDescriptionDoc(job);
          if (jd?.url) {
            return (
              <FilePreviewLink
                url={jd.url}
                filename={jd.filename}
                title={`${job.title} — Job Description`}
                className="text-left font-medium text-[#2563EB] underline-offset-2 hover:underline"
              >
                {job.title}
              </FilePreviewLink>
            );
          }
          return (
            <button
              type="button"
              className="text-left font-medium text-[#2563EB] underline-offset-2 hover:underline"
              onClick={(event) => {
                event.stopPropagation();
                onView(job);
              }}
            >
              {job.title}
            </button>
          );
        },
      },
      {
        id: "client",
        header: "Client",
        className: "text-[#64748B]",
        cell: (job) => job.clientName ?? "—",
      },
      ...(hideAccountManager
        ? []
        : [
            {
              id: "accountManager",
              header: "Account Manager",
              className: "text-[#64748B]",
              cell: (job: Job) => job.accountManagerName ?? "—",
            },
          ]),
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
        id: "workMode",
        header: "WFO / WFH",
        className: "text-[#64748B]",
        cell: (job) =>
          deriveJobWorkMode(job.location, job.workMode) ?? job.workMode ?? "—",
      },
      {
        id: "salary",
        header: "Salary Range",
        className: "text-[#64748B]",
        cell: (job) => job.salary ?? "—",
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
        id: "status",
        header: "Status",
        cell: (job) => <JobStatusBadge status={job.status} />,
      },
      {
        id: "submitted",
        header: "Submitted Profiles",
        className: "text-[#64748B]",
        cell: (job) => {
          const count = submittedByJobId[job.id] ?? 0;
          if (!submittedProfilesBasePath) {
            return count;
          }
          return (
            <Link
              href={`${submittedProfilesBasePath}?jobId=${encodeURIComponent(job.id)}`}
              className="font-semibold text-[#2563EB] underline-offset-2 hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {count}
            </Link>
          );
        },
      },
      {
        id: "createdAt",
        header: "Job Open Date",
        className: "text-[#64748B]",
        cell: (job) => {
          const openDate = job.postedDate || job.startDate || job.createdAt;
          return openDate ? formatDate(openDate) : "—";
        },
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        sticky: "right",
        className: "whitespace-nowrap",
        headerClassName: "whitespace-nowrap",
        cell: (job) => {
          const jd = jobDescriptionDoc(job);
          return (
            <div className="flex items-center justify-end gap-1">
              {jd?.url ? (
                <FilePreviewLink
                  asButton
                  variant="ghost"
                  size="icon"
                  url={jd.url}
                  filename={jd.filename}
                  title={`${job.title} — Job Description`}
                  className="h-9 w-9"
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  <span className="sr-only">View Job Description</span>
                </FilePreviewLink>
              ) : null}
              <JobActions
                job={job}
                canManage={canManage}
                canAllocate={canAllocate}
                canViewPartners={canViewPartners}
                onView={onView}
                onEdit={onEdit}
                onArchive={onArchive}
                onAllocate={onAllocate}
                onAssignAm={onAssignAm}
                onViewPartners={onViewPartners}
              />
            </div>
          );
        },
      },
    ],
    [
      canAllocate,
      canManage,
      canViewPartners,
      hideAccountManager,
      onAllocate,
      onArchive,
      onAssignAm,
      onEdit,
      onView,
      onViewPartners,
      submittedByJobId,
      submittedProfilesBasePath,
    ],
  );

  return (
    <DataTable
      columns={columns}
      data={jobs}
      getRowId={(job) => job.id}
      loading={loading}
      emptyTitle="No Jobs Found"
      emptyDescription={
        canManage
          ? "Try adjusting filters or create a new job requirement."
          : "Try adjusting filters. New jobs appear when Admin assigns your clients."
      }
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
