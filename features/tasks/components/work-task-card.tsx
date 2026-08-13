"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FilePreviewLink } from "@/components/shared/file-preview-link";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { JOB_PRIORITY_LABELS, JOB_STATUS_LABELS } from "@/features/jobs/types";
import { deriveJobWorkMode } from "@/features/jobs/lib/work-mode";
import type { PartnerWorkTask } from "@/features/tasks/types";

interface WorkTaskCardProps {
  task: PartnerWorkTask;
  onOpenJob: (task: PartnerWorkTask) => void;
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="partner-meta-label">{label}</p>
      <div className="partner-meta-value">{value ?? "—"}</div>
    </div>
  );
}

function formatDaysOfWorking(days: number | null | undefined): string | null {
  if (typeof days !== "number" || !Number.isFinite(days)) {
    return null;
  }
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function WorkTaskCard({ task, onOpenJob }: WorkTaskCardProps) {
  const salary = task.job.salary?.trim() || null;
  const workMode = deriveJobWorkMode(task.location, task.job.workMode);
  const daysOfWorking = formatDaysOfWorking(task.workDaysInWeek);
  const sampleProfile = task.job.documents.find(
    (doc) => doc.label === "Sample Profiling",
  );

  return (
    <article className="partner-job-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">
            {task.jobTitle}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Priority:{" "}
            <span className="font-medium text-foreground">
              {task.priority ? JOB_PRIORITY_LABELS[task.priority] : "—"}
            </span>
          </span>
          <JobStatusBadge status={task.job.status} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Meta label="Job ID" value={task.jobCode} />
        <Meta label="Client" value={task.clientName} />
        <Meta
          label="Priority"
          value={task.priority ? JOB_PRIORITY_LABELS[task.priority] : "—"}
        />
        <Meta
          label="Status"
          value={JOB_STATUS_LABELS[task.job.status] ?? task.job.status}
        />
        <Meta label="Location" value={task.location} />
        <Meta label="Years of Experience" value={task.experience} />
        <Meta label="Salary Range" value={salary} />
        <Meta
          label="Possible Payout"
          value={task.job.possiblePayout?.trim() || null}
        />
        <Meta label="Mode of Working" value={workMode} />
        <Meta label="Days of Working" value={daysOfWorking} />
        <Meta
          label="Submitted Profiles"
          value={
            <Link
              href={`/partner/candidates?jobId=${encodeURIComponent(task.jobId)}`}
              className="font-semibold text-primary underline-offset-2 hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {task.submittedProfiles}
            </Link>
          }
        />
        <Meta
          label="Sample Profile"
          value={
            sampleProfile ? (
              <FilePreviewLink
                url={sampleProfile.url}
                filename={sampleProfile.filename}
                title={`Sample Profile: ${sampleProfile.filename}`}
                className="font-medium text-success underline-offset-2 hover:underline"
              >
                View / Download
              </FilePreviewLink>
            ) : (
              "—"
            )
          }
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-border/80 pt-4">
        <Button type="button" variant="outline" onClick={() => onOpenJob(task)}>
          Open Job
        </Button>
      </div>
    </article>
  );
}
