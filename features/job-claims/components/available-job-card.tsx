"use client";

import { FilePreviewLink } from "@/components/shared/file-preview-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { springs, useMotionSafe } from "@/components/motion/presets";
import { JOB_PRIORITY_LABELS, JOB_STATUS_LABELS } from "@/features/jobs/types";
import { formatReclaimAvailability } from "@/features/job-claims/lib/reclaim";
import type {
  PartnerAvailableJob,
  PartnerJobClaimUiState,
} from "@/features/job-claims/types";
import { motion } from "framer-motion";

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
      <div className="partner-meta-value">{value || "—"}</div>
    </div>
  );
}

export function claimStateLabel(state: PartnerJobClaimUiState): string {
  switch (state) {
    case "available":
      return "Available";
    case "pending":
      return "Claim Pending";
    case "approved":
      return "Assigned";
    case "rejected":
      return "Claim Again";
    case "cooling":
      return "Waiting to reclaim";
  }
}

function ClaimStateBadge({ state }: { state: PartnerJobClaimUiState }) {
  if (state === "pending") {
    return <Badge variant="warning">Claim Pending</Badge>;
  }
  if (state === "approved") {
    return <Badge variant="success">Assigned</Badge>;
  }
  if (state === "rejected") {
    return <Badge variant="outline">Claim Rejected — Reclaim available</Badge>;
  }
  if (state === "cooling") {
    return <Badge variant="outline">Claim Rejected</Badge>;
  }
  return <Badge variant="secondary">Available</Badge>;
}

interface AvailableJobCardProps {
  job: PartnerAvailableJob;
  claiming: boolean;
  onView: (job: PartnerAvailableJob) => void;
  onClaim: (job: PartnerAvailableJob) => void;
}

export function AvailableJobCard({
  job,
  claiming,
  onView,
  onClaim,
}: AvailableJobCardProps) {
  const canClaim =
    job.claimState === "available" || job.claimState === "rejected";
  const animate = useMotionSafe();
  const reclaimLabel = formatReclaimAvailability(job.claimReclaimAvailableAt);

  return (
    <motion.article
      className="partner-job-card will-change-transform"
      initial={animate ? { opacity: 0, y: 10 } : false}
      whileInView={animate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: "-40px" }}
      whileHover={animate ? { y: -3 } : undefined}
      transition={springs.soft}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">
            {job.title}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClaimStateBadge state={job.claimState} />
          <span className="text-xs text-muted-foreground">
            Priority:{" "}
            <span className="font-medium text-foreground">
              {job.priority ? JOB_PRIORITY_LABELS[job.priority] : "—"}
            </span>
          </span>
          <Badge variant="outline">
            Status: {JOB_STATUS_LABELS[job.status] ?? job.status}
          </Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Meta label="Job ID" value={job.jobCode} />
        <Meta
          label="Priority"
          value={job.priority ? JOB_PRIORITY_LABELS[job.priority] : null}
        />
        <Meta
          label="Status"
          value={JOB_STATUS_LABELS[job.status] ?? job.status}
        />
        <Meta label="Location" value={job.location} />
        <Meta label="Years of Experience" value={job.experience} />
        <Meta label="Mode of Working" value={job.workMode} />
        <Meta label="Days of Working" value={job.daysOfWorking} />
        <Meta label="Salary Range" value={job.salary} />
        <Meta label="Possible Payout" value={job.possiblePayout} />
      </div>

      {job.claimState === "pending" ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Request sent. Waiting for Account Manager or Admin approval. Client
          details unlock after approval.
        </p>
      ) : null}

      {job.claimState === "cooling" || job.claimState === "rejected" ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {job.claimRejectionReason
            ? `Rejected: ${job.claimRejectionReason}. `
            : "Claim rejected. "}
          {reclaimLabel}
          {job.claimState === "rejected"
            ? " You can submit a new claim request."
            : null}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-border/80 pt-4">
        <Button type="button" variant="outline" onClick={() => onView(job)}>
          View Job
        </Button>
        {canClaim ? (
          <Button
            type="button"
            disabled={claiming}
            aria-busy={claiming}
            onClick={() => onClaim(job)}
          >
            {claiming
              ? "Submitting…"
              : job.claimState === "rejected"
                ? "Claim Again"
                : "Claim Job"}
          </Button>
        ) : (
          <Button type="button" variant="secondary" disabled>
            {job.claimState === "cooling"
              ? reclaimLabel
              : claimStateLabel(job.claimState)}
          </Button>
        )}
      </div>
    </motion.article>
  );
}

interface AvailableJobDetailProps {
  job: PartnerAvailableJob;
  claiming: boolean;
  onClaim: (job: PartnerAvailableJob) => void;
  /** When true, claim CTA is provided by the drawer sticky footer. */
  hideInlineClaim?: boolean;
}

export function AvailableJobDetailBody({
  job,
  claiming,
  onClaim,
  hideInlineClaim = false,
}: AvailableJobDetailProps) {
  const canClaim =
    job.claimState === "available" || job.claimState === "rejected";
  const reclaimLabel = formatReclaimAvailability(job.claimReclaimAvailableAt);
  const jdDocs = job.documents.filter((doc) => doc.label === "Job Description");
  const sampleDocs = job.documents.filter(
    (doc) => doc.label === "Sample Profiling",
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <ClaimStateBadge state={job.claimState} />
        <span className="text-sm font-medium text-foreground">
          Job ID: {job.jobCode || "—"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Meta label="Location" value={job.location} />
        <Meta label="Mode of Working" value={job.workMode} />
        <Meta label="Days of Working" value={job.daysOfWorking} />
        <Meta label="Years of Experience" value={job.experience} />
        <Meta label="Salary Range" value={job.salary} />
        <Meta label="Possible Payout" value={job.possiblePayout} />
        <Meta
          label="Priority"
          value={job.priority ? JOB_PRIORITY_LABELS[job.priority] : null}
        />
      </div>

      <div>
        <p className="partner-section-label">Additional Comments</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
          {job.description?.trim() || "—"}
        </p>
      </div>

      <div>
        <p className="partner-section-label">Interview Process R1 KYC</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
          {job.interviewProcess?.trim() || "—"}
        </p>
      </div>

      <div>
        <p className="partner-section-label">Job Description</p>
        {jdDocs.length > 0 ? (
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
        ) : (
          <p className="mt-1 text-sm text-foreground">—</p>
        )}
      </div>

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

      <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        Client details stay hidden until an Account Manager or Admin approves
        your claim. Claiming requests access — it does not assign the job yet.
      </p>

      {job.claimState === "pending" ? (
        <p className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-foreground">
          Claim pending — you will be notified when this request is reviewed.
        </p>
      ) : null}

      {job.claimState === "cooling" || job.claimState === "rejected" ? (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {job.claimRejectionReason
            ? `Rejected: ${job.claimRejectionReason}. `
            : "Claim rejected. "}
          {reclaimLabel}
        </p>
      ) : null}

      {!hideInlineClaim && canClaim ? (
        <Button
          type="button"
          className="w-full"
          disabled={claiming}
          aria-busy={claiming}
          onClick={() => onClaim(job)}
        >
          {claiming
            ? "Submitting…"
            : job.claimState === "rejected"
              ? "Claim Again"
              : "Claim Job"}
        </Button>
      ) : null}
      {!hideInlineClaim && !canClaim ? (
        <Button type="button" className="w-full" variant="secondary" disabled>
          {claimStateLabel(job.claimState)}
        </Button>
      ) : null}
    </div>
  );
}
