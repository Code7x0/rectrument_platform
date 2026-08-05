"use client";

import type { ReactNode } from "react";

import { DetailDrawer } from "@/components/shared/detail-drawer";
import { FilePreviewLink } from "@/components/shared/file-preview-link";
import { filePreviewHref } from "@/lib/files/file-preview";
import { Badge } from "@/components/ui/badge";
import { EntityActivityInline } from "@/features/activity/components/entity-activity-inline";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_PRIORITY_LABELS,
  type Job,
} from "@/features/jobs/types";
import { deriveJobWorkMode } from "@/features/jobs/lib/work-mode";
import { formatDate } from "@/lib/utils";

interface JobDrawerProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional header + footer (e.g. Partner “Submit Candidate”). */
  headerAction?: ReactNode;
  footer?: ReactNode;
  /**
   * Partner view: hide commercial client / AM names, prioritize JD + submit CTA.
   */
  partnerView?: boolean;
  /** Submitted profiles for this partner allocation (partner view). */
  submittedProfiles?: number | null;
  /** AM view: hide own name. */
  hideAccountManager?: boolean;
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
      <p className="mt-1 whitespace-pre-wrap text-sm text-[#0F172A]">
        {value || "—"}
      </p>
    </div>
  );
}

export function JobDrawer({
  job,
  open,
  onOpenChange,
  headerAction,
  footer,
  partnerView = false,
  submittedProfiles = null,
  hideAccountManager = false,
}: JobDrawerProps) {
  const descriptionText = job?.description?.trim() || null;
  const hasDocuments = Boolean(job && job.documents.length > 0);
  const workMode = deriveJobWorkMode(job?.location, job?.workMode);
  const openDate = job?.postedDate || job?.startDate || job?.createdAt;

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={job?.title ?? "Job details"}
      stickyHeader={headerAction ?? undefined}
      stickyFooter={footer ?? undefined}
    >
      {job ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <JobStatusBadge status={job.status} />
            {!partnerView && workMode ? (
              <Badge variant="secondary">{workMode}</Badge>
            ) : null}
            <span className="text-sm font-medium text-[#0F172A]">
              Job ID: {job.jobCode || "—"}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {!partnerView ? (
              <>
                <Detail label="Client" value={job.clientName} />
                {!hideAccountManager ? (
                  <Detail
                    label="Assigned Account Manager"
                    value={job.accountManagerName}
                  />
                ) : null}
                <Detail label="Hiring Manager" value={job.hiringManager} />
              </>
            ) : null}
            <Detail label="Location" value={job.location} />
            <Detail label="WFO / WFH" value={workMode} />
            <Detail
              label="Employment Type"
              value={
                job.employmentType
                  ? EMPLOYMENT_TYPE_LABELS[job.employmentType]
                  : null
              }
            />
            <Detail label="Years of Experience" value={job.experience} />
            {!partnerView ? (
              <Detail label="Seniority" value={job.seniorityLevel} />
            ) : null}
            <Detail label="Salary Range" value={job.salary} />
            <Detail
              label="Priority"
              value={job.priority ? JOB_PRIORITY_LABELS[job.priority] : null}
            />
            <Detail label="Open Positions" value={job.openPositions} />
            {partnerView && submittedProfiles != null ? (
              <Detail label="Submitted Profiles" value={submittedProfiles} />
            ) : null}
            {!partnerView ? (
              <Detail
                label="Job Open Date"
                value={openDate ? formatDate(openDate) : null}
              />
            ) : null}
          </div>

          <Detail label="Skills" value={job.skills.join(", ") || null} />

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
              Description
            </p>
            {descriptionText ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-[#0F172A]">
                {descriptionText}
              </p>
            ) : hasDocuments ? (
              <p className="mt-1 text-sm text-[#64748B]">
                Job Description is available as attachments below.
              </p>
            ) : (
              <p className="mt-1 text-sm text-[#0F172A]">—</p>
            )}
          </div>

          {!partnerView ? (
            <Detail label="Interview process" value={job.interviewProcess} />
          ) : null}

          {job.notes &&
          job.notes.trim() &&
          job.notes.trim() !== (job.description ?? "").trim() ? (
            <Detail label="Notes" value={job.notes} />
          ) : null}

          {hasDocuments ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
                Documents
              </p>
              <ul className="mt-2 space-y-2">
                {job.documents.map((doc, index) => (
                  <li key={`${doc.label}-${doc.url}`}>
                    {partnerView ? (
                      <a
                        href={filePreviewHref(doc.url, doc.filename)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-[#0F766E] underline-offset-2 hover:underline"
                      >
                        {job.documents.length > 1
                          ? `Job Description ${index + 1}`
                          : "Job Description"}
                      </a>
                    ) : (
                      <FilePreviewLink
                        url={doc.url}
                        filename={doc.filename}
                        title={`${doc.label}: ${doc.filename}`}
                        className="text-sm font-medium text-[#0F766E] underline-offset-2 hover:underline"
                      >
                        {doc.label}: {doc.filename}
                      </FilePreviewLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!partnerView ? (
            <div className="border-t border-[#E2E8F0] pt-5">
              <EntityActivityInline
                entityRef={{ kind: "job", id: job.id }}
                title="Job activity"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </DetailDrawer>
  );
}
