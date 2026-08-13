"use client";

import type { ReactNode } from "react";

import { DetailDrawer } from "@/components/shared/detail-drawer";
import { FilePreviewLink } from "@/components/shared/file-preview-link";
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
   * Partner view: prioritize JD + sample profile + submit CTA.
   * Client is shown for assigned jobs (allocation = approved access).
   */
  partnerView?: boolean;
  /** Submitted profiles for this partner allocation (partner view). */
  submittedProfiles?: number | null;
  /** Clients.Work Days/Week — partner "Days of Working". */
  workDaysInWeek?: number | null;
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
      <p className="partner-section-label">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
        {value || "—"}
      </p>
    </div>
  );
}

function formatDaysOfWorking(days: number | null | undefined): string | null {
  if (typeof days !== "number" || !Number.isFinite(days)) {
    return null;
  }
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function JobDrawer({
  job,
  open,
  onOpenChange,
  headerAction,
  footer,
  partnerView = false,
  submittedProfiles = null,
  workDaysInWeek = null,
  hideAccountManager = false,
}: JobDrawerProps) {
  const descriptionText = job?.description?.trim() || null;
  const workMode = deriveJobWorkMode(job?.location, job?.workMode);
  const openDate = job?.postedDate || job?.startDate || job?.createdAt;
  const daysOfWorking = formatDaysOfWorking(workDaysInWeek);
  const jdDocs =
    job?.documents.filter((doc) => doc.label === "Job Description") ?? [];
  const sampleDocs =
    job?.documents.filter((doc) => doc.label === "Sample Profiling") ?? [];
  const otherDocs =
    job?.documents.filter(
      (doc) =>
        doc.label !== "Job Description" && doc.label !== "Sample Profiling",
    ) ?? [];

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
            <Detail label="Client" value={job.clientName} />
            {!partnerView && !hideAccountManager ? (
              <Detail
                label="Assigned Account Managers"
                value={job.accountManagerName}
              />
            ) : null}
            {!partnerView ? (
              <Detail label="Hiring Manager" value={job.hiringManager} />
            ) : null}
            <Detail label="Location" value={job.location} />
            <Detail label="Mode of Working" value={workMode} />
            {partnerView || workDaysInWeek != null ? (
              <Detail label="Days of Working" value={daysOfWorking} />
            ) : null}
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

          {!partnerView && job.skills.length > 0 ? (
            <Detail label="Skills" value={job.skills.join(", ")} />
          ) : null}

          <div>
            <p className="partner-section-label">
              {partnerView ? "Additional Comments" : "Description"}
            </p>
            {descriptionText ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {descriptionText}
              </p>
            ) : jdDocs.length > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Job Description is available as attachments below.
              </p>
            ) : (
              <p className="mt-1 text-sm text-foreground">—</p>
            )}
          </div>

          <Detail
            label="Interview Process R1 KYC"
            value={job.interviewProcess}
          />

          {job.notes &&
          job.notes.trim() &&
          job.notes.trim() !== (job.description ?? "").trim() ? (
            <Detail label="Notes" value={job.notes} />
          ) : null}

          {jdDocs.length > 0 ? (
            <div>
              <p className="partner-section-label">Job Description</p>
              <ul className="mt-2 space-y-2">
                {jdDocs.map((doc) => (
                  <li key={`${doc.label}-${doc.url}`}>
                    <FilePreviewLink
                      url={doc.url}
                      filename={doc.filename}
                      title={`Job Description: ${doc.filename}`}
                      className="text-sm font-medium text-success underline-offset-2 hover:underline"
                    >
                      {doc.filename}
                    </FilePreviewLink>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <p className="partner-section-label">Sample Profile</p>
            {sampleDocs.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {sampleDocs.map((doc) => (
                  <li key={`${doc.label}-${doc.url}`}>
                    <FilePreviewLink
                      url={doc.url}
                      filename={doc.filename}
                      title={`Sample Profile: ${doc.filename}`}
                      className="text-sm font-medium text-success underline-offset-2 hover:underline"
                    >
                      View / Download · {doc.filename}
                    </FilePreviewLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-foreground">—</p>
            )}
          </div>

          {otherDocs.length > 0 ? (
            <div>
              <p className="partner-section-label">Other documents</p>
              <ul className="mt-2 space-y-2">
                {otherDocs.map((doc) => (
                  <li key={`${doc.label}-${doc.url}`}>
                    <FilePreviewLink
                      url={doc.url}
                      filename={doc.filename}
                      title={`${doc.label}: ${doc.filename}`}
                      className="text-sm font-medium text-success underline-offset-2 hover:underline"
                    >
                      {doc.label}: {doc.filename}
                    </FilePreviewLink>
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
