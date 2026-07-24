"use client";

import type { ReactNode } from "react";

import { DetailDrawer } from "@/components/shared/detail-drawer";
import { EntityActivityInline } from "@/features/activity/components/entity-activity-inline";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_PRIORITY_LABELS,
  type Job,
} from "@/features/jobs/types";
import { formatDate } from "@/lib/utils";

interface JobDrawerProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional footer (e.g. Partner “Submit Candidate”). */
  footer?: ReactNode;
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[#0F172A]">{value || "—"}</p>
    </div>
  );
}

export function JobDrawer({
  job,
  open,
  onOpenChange,
  footer,
}: JobDrawerProps) {
  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={job?.title ?? "Job details"}
    >
      {job ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <JobStatusBadge status={job.status} />
            <span className="text-sm text-[#64748B]">
              {job.jobCode || "—"}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Detail label="Client" value={job.clientName} />
            <Detail
              label="Assigned Account Manager"
              value={job.accountManagerName}
            />
            <Detail label="Hiring Manager" value={job.hiringManager} />
            <Detail label="Location" value={job.location} />
            <Detail
              label="Employment Type"
              value={
                job.employmentType
                  ? EMPLOYMENT_TYPE_LABELS[job.employmentType]
                  : null
              }
            />
            <Detail label="Experience" value={job.experience} />
            <Detail label="Salary" value={job.salary} />
            <Detail
              label="Priority"
              value={job.priority ? JOB_PRIORITY_LABELS[job.priority] : null}
            />
            <Detail label="Open Positions" value={job.openPositions} />
            <Detail label="Department" value={job.department} />
            <Detail
              label="Created"
              value={job.createdAt ? formatDate(job.createdAt) : null}
            />
          </div>

          <Detail label="Skills" value={job.skills.join(", ") || null} />
          <Detail label="Description" value={job.description} />
          <Detail label="Notes" value={job.notes} />

          <div className="border-t border-[#E2E8F0] pt-5">
            <EntityActivityInline
              entityRef={{ kind: "job", id: job.id }}
              title="Job activity"
            />
          </div>

          {footer ? <div className="border-t border-[#E2E8F0] pt-5">{footer}</div> : null}
        </div>
      ) : null}
    </DetailDrawer>
  );
}
