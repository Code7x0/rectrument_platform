"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EntityActivityInline } from "@/features/activity/components/entity-activity-inline";
import type { Candidate } from "@/features/candidates/types";
import type { Job } from "@/features/jobs/types";
import { JOB_PRIORITY_LABELS } from "@/features/jobs/types";
import { SubmissionStatusBadge } from "@/features/submissions/components/submission-status-badge";
import type { Submission } from "@/features/submissions/types";
import { getReviewDetailAction } from "@/features/workflows/actions/review.actions";
import { transitionSubmissionAction } from "@/features/workflows/actions/workflows.actions";
import {
  getAllowedTransitions,
  TRANSITION_ACTION_LABELS,
} from "@/features/workflows/types";
import type { SubmissionStatus } from "@/features/shared/entities";
import { SUBMISSION_STATUS_LABELS } from "@/features/shared/entities";
import { formatDate } from "@/lib/utils";

interface ReviewQueuePageClientProps {
  initialSubmissions: Submission[];
  canTransition: boolean;
  breadcrumbs: Array<{ label: string; href?: string }>;
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

export function ReviewQueuePageClient({
  initialSubmissions,
  canTransition,
  breadcrumbs,
}: ReviewQueuePageClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Submission | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<SubmissionStatus | null>(
    null,
  );
  const [transitioning, setTransitioning] = useState(false);

  async function openReview(row: Submission) {
    setSelected(row);
    setCandidate(null);
    setJob(null);
    setLoadingDetail(true);
    try {
      const result = await getReviewDetailAction(row.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setSelected(result.data.submission);
      setCandidate(result.data.candidate);
      setJob(result.data.job);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function confirmTransition() {
    if (!selected || !pendingStatus) {
      return;
    }

    setTransitioning(true);
    try {
      const result = await transitionSubmissionAction(
        selected.id,
        pendingStatus,
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(`Moved to ${SUBMISSION_STATUS_LABELS[pendingStatus]}`);
      setPendingStatus(null);
      setSelected(null);
      setCandidate(null);
      setJob(null);
      router.refresh();
    } finally {
      setTransitioning(false);
    }
  }

  const columns = useMemo<DataTableColumn<Submission>[]>(
    () => [
      {
        id: "candidate",
        header: "Candidate",
        cell: (row) => (
          <span className="font-medium text-[#0F172A]">
            {row.candidateName ?? "—"}
          </span>
        ),
      },
      {
        id: "job",
        header: "Job",
        className: "text-[#64748B]",
        cell: (row) => row.jobTitle ?? "—",
      },
      {
        id: "partner",
        header: "Partner",
        className: "text-[#64748B]",
        cell: (row) => row.partnerName ?? "—",
      },
      {
        id: "date",
        header: "Submission Date",
        className: "text-[#64748B]",
        cell: (row) =>
          row.submissionDate ? formatDate(row.submissionDate) : "—",
      },
      {
        id: "status",
        header: "Current Status",
        cell: (row) => <SubmissionStatusBadge status={row.status} />,
      },
      {
        id: "priority",
        header: "Priority",
        className: "text-[#64748B]",
        cell: (row) =>
          row.jobPriority ? JOB_PRIORITY_LABELS[row.jobPriority] : "—",
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        cell: (row) => (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Review submission"
            onClick={() => void openReview(row)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  const nextStatuses = selected ? getAllowedTransitions(selected.status) : [];

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="Review Queue"
        description={
          canTransition
            ? "Submissions awaiting review. Status changes go through the Workflow Service."
            : "Read-only view of the review pipeline."
        }
      />

      <DataTable
        columns={columns}
        data={initialSubmissions}
        getRowId={(row) => row.id}
        emptyTitle="No submissions to review"
        emptyDescription="New partner submissions will appear here."
      />

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setCandidate(null);
            setJob(null);
          }
        }}
        title={selected?.candidateName ?? "Review submission"}
      >
        {selected ? (
          <div className="space-y-6">
            <SubmissionStatusBadge status={selected.status} />

            {loadingDetail ? (
              <p className="text-sm text-[#64748B]">Loading details…</p>
            ) : (
              <>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#0F172A]">
                    Candidate Details
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Detail label="Name" value={candidate?.fullName} />
                    <Detail label="Email" value={candidate?.email} />
                    <Detail label="Phone" value={candidate?.phone} />
                    <Detail label="Experience" value={candidate?.experience} />
                    <Detail
                      label="Current Company"
                      value={candidate?.currentCompany}
                    />
                    <Detail
                      label="Location"
                      value={candidate?.currentLocation}
                    />
                    <Detail label="Current CTC" value={candidate?.currentCtc} />
                    <Detail
                      label="Expected CTC"
                      value={candidate?.expectedCtc}
                    />
                    <Detail
                      label="Notice Period"
                      value={candidate?.noticePeriod}
                    />
                    <Detail
                      label="Skills"
                      value={candidate?.skills.join(", ") || null}
                    />
                  </div>
                  {candidate?.resumeUrl ? (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={candidate.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Resume
                      </a>
                    </Button>
                  ) : (
                    <p className="text-sm text-[#64748B]">No resume on file</p>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#0F172A]">
                    Job Details
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Detail
                      label="Job"
                      value={job?.title ?? selected.jobTitle}
                    />
                    <Detail label="Client" value={job?.clientName} />
                    <Detail label="Location" value={job?.location} />
                    <Detail
                      label="Priority"
                      value={
                        job?.priority
                          ? JOB_PRIORITY_LABELS[job.priority]
                          : selected.jobPriority
                            ? JOB_PRIORITY_LABELS[selected.jobPriority]
                            : null
                      }
                    />
                  </div>
                </section>

                <section className="space-y-3">
                  <Detail label="Partner" value={selected.partnerName} />
                  <Detail label="Notes" value={selected.remarks} />
                  <Detail
                    label="Current Status"
                    value={SUBMISSION_STATUS_LABELS[selected.status]}
                  />
                </section>
              </>
            )}

            {canTransition && nextStatuses.length > 0 ? (
              <div className="space-y-2 border-t border-[#E2E8F0] pt-4">
                {nextStatuses.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    className="w-full"
                    variant={status === "rejected" ? "destructive" : "default"}
                    onClick={() => setPendingStatus(status)}
                  >
                    {TRANSITION_ACTION_LABELS[status] ??
                      `Move to ${SUBMISSION_STATUS_LABELS[status]}`}
                  </Button>
                ))}
              </div>
            ) : null}

            <div className="border-t border-[#E2E8F0] pt-4">
              <EntityActivityInline
                entityRef={{ kind: "submission", id: selected.id }}
                title="Submission activity"
              />
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatus(null);
          }
        }}
        title="Confirm status change"
        description={
          pendingStatus
            ? `Move this submission to ${SUBMISSION_STATUS_LABELS[pendingStatus]}?`
            : ""
        }
        confirmLabel="Confirm"
        variant={pendingStatus === "rejected" ? "destructive" : "default"}
        loading={transitioning}
        onConfirm={confirmTransition}
      />
    </ContentContainer>
  );
}
