"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  ExternalLink,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { FilePreviewLink } from "@/components/shared/file-preview-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PayoutStatusBadge } from "@/features/payouts/components/payout-status-badge";
import type { Payout } from "@/features/payouts/types";
import { requestSecondLevelReviewAction } from "@/features/submissions/actions/review-fields.actions";
import { deleteOwnUnreviewedSubmissionAction } from "@/features/submissions/actions/submissions.actions";
import { EditCandidateDialog } from "@/features/submissions/components/edit-candidate-dialog";
import { SecondLevelReviewBadge } from "@/features/submissions/components/second-level-review-badge";
import { SubmissionReviewPanel } from "@/features/submissions/components/submission-review-panel";
import { SubmissionStatusBadge } from "@/features/submissions/components/submission-status-badge";
import { isUnreviewedByStaff } from "@/features/submissions/lib/partner-edit-eligibility";
import type { Submission } from "@/features/submissions/types";
import {
  AIRTABLE_SUBMISSION_STATUS_OPTIONS,
  resolveAirtableSubmissionStatusOption,
} from "@/lib/airtable/fields";
import {
  isSubmissionStatusGroupId,
  matchesExactSubmissionStatuses,
  matchesSubmissionStatusGroup,
  parseStatusFilterParam,
  type SubmissionStatusGroupId,
} from "@/features/submissions/lib/submission-status-buckets";
import { signalLiveDataChange } from "@/lib/live-sync";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface PartnerSubmissionsPageClientProps {
  submissions: Submission[];
  payoutsBySubmission?: Record<string, Payout>;
  breadcrumbs: Array<{ label: string; href?: string }>;
  filterJobId?: string | null;
  filterJobLabel?: string | null;
  initialStatus?: string | null;
  initialStatusGroup?: string | null;
}

const STATUS_GROUP_FILTER_OPTIONS: Array<{
  id: SubmissionStatusGroupId;
  label: string;
}> = [
  { id: "pending_review", label: "Pending with Account Managers" },
  { id: "hold", label: "Hold" },
  { id: "internal_screening", label: "Internal Screening in Progress" },
  { id: "being_submitted", label: "Being Submitted to Client" },
  { id: "interviewing", label: "Interviewing" },
  { id: "selected", label: "Selected" },
  { id: "offers", label: "Offers" },
  { id: "joined", label: "Joining" },
];

const STATUS_FILTER_OPTIONS = [
  "all",
  ...STATUS_GROUP_FILTER_OPTIONS.map((g) => `group:${g.id}`),
  ...AIRTABLE_SUBMISSION_STATUS_OPTIONS,
] as const;

function statusFilterLabel(value: string): string {
  if (value === "all") {
    return "All statuses";
  }
  if (value.startsWith("group:")) {
    const id = value.slice("group:".length);
    return (
      STATUS_GROUP_FILTER_OPTIONS.find((g) => g.id === id)?.label ?? value
    );
  }
  if (value.includes("|")) {
    return value
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" / ");
  }
  return value.trim();
}

function matchesAirtableStatusFilter(row: Submission, filter: string): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter.startsWith("group:")) {
    const groupId = filter.slice("group:".length);
    if (isSubmissionStatusGroupId(groupId)) {
      return matchesSubmissionStatusGroup(row, groupId);
    }
    return false;
  }
  const wanted = parseStatusFilterParam(filter);
  if (wanted.length > 1) {
    return matchesExactSubmissionStatuses(row, wanted);
  }
  const current = resolveAirtableSubmissionStatusOption(row.airtableStatus);
  const want = resolveAirtableSubmissionStatusOption(filter);
  if (current && want) {
    return current === want || current.trim() === want.trim();
  }
  return (row.airtableStatus ?? "").trim() === filter.trim();
}

export function PartnerSubmissionsPageClient({
  submissions: initialSubmissions,
  payoutsBySubmission = {},
  breadcrumbs,
  filterJobId = null,
  filterJobLabel = null,
  initialStatus = null,
  initialStatusGroup = null,
}: PartnerSubmissionsPageClientProps) {
  const router = useRouter();
  const [rows, setRows] = useState(initialSubmissions);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (initialStatusGroup && isSubmissionStatusGroupId(initialStatusGroup)) {
      return `group:${initialStatusGroup}`;
    }
    if (initialStatus?.trim()) {
      return initialStatus.trim();
    }
    return "all";
  });
  const [jobTitleFilter, setJobTitleFilter] = useState("");
  const [requestingReview, setRequestingReview] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setRows(initialSubmissions);
    setSelected((current) => {
      if (!current) {
        return null;
      }
      return (
        initialSubmissions.find((row) => row.id === current.id) ?? current
      );
    });
  }, [initialSubmissions]);

  useEffect(() => {
    if (initialStatusGroup && isSubmissionStatusGroupId(initialStatusGroup)) {
      setStatusFilter(`group:${initialStatusGroup}`);
      return;
    }
    if (initialStatus?.trim()) {
      setStatusFilter(initialStatus.trim());
      return;
    }
    setStatusFilter("all");
  }, [initialStatus, initialStatusGroup]);

  const statusSelectOptions = useMemo(() => {
    const base = [...STATUS_FILTER_OPTIONS];
    if (
      statusFilter !== "all" &&
      !(base as string[]).includes(statusFilter)
    ) {
      base.splice(1, 0, statusFilter as (typeof STATUS_FILTER_OPTIONS)[number]);
    }
    return base;
  }, [statusFilter]);

  const filteredRows = useMemo(() => {
    let next = rows;
    if (statusFilter !== "all") {
      next = next.filter((row) => matchesAirtableStatusFilter(row, statusFilter));
    }
    const q = jobTitleFilter.trim().toLowerCase();
    if (q) {
      next = next.filter((row) =>
        (row.jobTitle ?? "").toLowerCase().includes(q),
      );
    }
    return next;
  }, [rows, statusFilter, jobTitleFilter]);

  async function requestReview(row: Submission) {
    setRequestingReview(true);
    try {
      const result = await requestSecondLevelReviewAction(row.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Second level review requested");
      setRows((current) =>
        current.map((item) => (item.id === row.id ? result.data : item)),
      );
      setSelected(result.data);
      signalLiveDataChange();
      router.refresh();
    } finally {
      setRequestingReview(false);
    }
  }

  async function confirmDelete() {
    if (!deletingId || deleting) {
      return;
    }
    setDeleting(true);
    try {
      const result = await deleteOwnUnreviewedSubmissionAction(deletingId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Candidate removed");
      setRows((current) => current.filter((item) => item.id !== deletingId));
      setSelected((current) =>
        current?.id === deletingId ? null : current,
      );
      setDeletingId(null);
      signalLiveDataChange();
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title={`My Candidates (${filteredRows.length})`}
        description="Track status, interview stage, Screening Matrix, and Internal Feedback."
      />

      {filterJobId ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3">
          <p className="text-sm text-[#1E3A8A]">
            Showing submissions for{" "}
            <span className="font-semibold">
              {filterJobLabel ?? "this requisition"}
            </span>
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/partner/candidates">
              <X className="h-3.5 w-3.5" />
              Clear filter
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="partner-status-filter">Submission Status</Label>
          <Select
            id="partner-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {statusSelectOptions.map((status) => (
              <option key={status} value={status}>
                {statusFilterLabel(status)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="partner-job-title-filter">Job Title</Label>
          <Input
            id="partner-job-title-filter"
            value={jobTitleFilter}
            onChange={(event) => setJobTitleFilter(event.target.value)}
            placeholder="Filter by job title"
          />
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          title={filterJobId ? "No submissions for this job" : "No submissions yet"}
          description={
            filterJobId
              ? "Submit a candidate from Assigned Jobs for this requisition."
              : "Open Assigned Jobs, select a job, and submit a candidate."
          }
          icon={<ClipboardList className="h-5 w-5" />}
        />
      ) : (
        <div className="space-y-3">
          {filteredRows.map((row) => {
            const payout = payoutsBySubmission[row.id];
            return (
              <article
                key={row.id}
                className="rounded-2xl border border-[#E2E8F0] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[#0F172A]">
                      {row.candidateName ?? "Candidate"}
                    </h3>
                    <p className="text-sm text-[#64748B]">
                      {row.jobCode ? `${row.jobCode} · ` : ""}
                      {row.jobTitle ?? "Job"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {row.resumeUrl ? (
                        <FilePreviewLink
                          url={row.resumeUrl}
                          filename={row.resumeFilename}
                          title={`${row.candidateName ?? "Candidate"} resume`}
                          className="inline-flex items-center gap-1 font-medium text-[#2563EB] hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Resume
                        </FilePreviewLink>
                      ) : null}
                      {row.linkedIn ? (
                        <a
                          href={row.linkedIn}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-[#2563EB] hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          LinkedIn
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SubmissionStatusBadge
                      status={row.status}
                      airtableStatus={row.airtableStatus}
                      label={row.airtableStatus}
                    />
                    {row.wantsSecondLevelReview ? (
                      <SecondLevelReviewBadge />
                    ) : null}
                    <PayoutStatusBadge
                      status={payout?.payoutStatus ?? "not_eligible"}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#94A3B8]">
                  <span>
                    Submitted{" "}
                    {row.submissionDate
                      ? formatDateTime(row.submissionDate)
                      : "—"}
                  </span>
                  <span>Interview: {row.interviewStage || "Not set"}</span>
                  {payout?.amount != null && payout.amount > 0 ? (
                    <span>
                      {formatCurrency(payout.amount, payout.currency)}
                    </span>
                  ) : null}
                  {payout?.lastUpdated ? (
                    <span>Updated {formatDateTime(payout.lastUpdated)}</span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSelected(row)}
                  >
                    View progress
                  </Button>
                  {isUnreviewedByStaff(row) ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setEditingId(row.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingId(row.id)}
                      >
                        Remove
                      </Button>
                    </>
                  ) : null}
                  {row.status === "rejected" && !row.wantsSecondLevelReview ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={requestingReview}
                      onClick={() => void requestReview(row)}
                    >
                      Request 2nd Level Review
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
        title={selected?.candidateName ?? "Candidate progress"}
      >
        {selected ? (
          <div className="space-y-4">
            <SubmissionReviewPanel submission={selected} canEdit={false} />
            {isUnreviewedByStaff(selected) ? (
              <>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => setEditingId(selected.id)}
                >
                  Edit candidate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setDeletingId(selected.id)}
                >
                  Remove profile
                </Button>
              </>
            ) : null}
            {selected.status === "rejected" &&
            !selected.wantsSecondLevelReview ? (
              <Button
                type="button"
                className="w-full"
                disabled={requestingReview}
                onClick={() => void requestReview(selected)}
              >
                Request 2nd Level Review
              </Button>
            ) : null}
            <p className="text-xs text-[#94A3B8]">
              Submitted{" "}
              {selected.submissionDate
                ? formatDate(selected.submissionDate)
                : "—"}
            </p>
          </div>
        ) : null}
      </DetailDrawer>

      <EditCandidateDialog
        open={Boolean(editingId)}
        submissionId={editingId}
        onOpenChange={(next) => {
          if (!next) {
            setEditingId(null);
          }
        }}
        onUpdated={(updated) => {
          setRows((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
          setSelected((current) =>
            current?.id === updated.id ? updated : current,
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingId)}
        onOpenChange={(next) => {
          if (!next && !deleting) {
            setDeletingId(null);
          }
        }}
        title="Remove this profile?"
        description="This permanently removes the uploaded candidate while it is still pending review. You cannot undo this."
        confirmLabel="Remove profile"
        cancelLabel="Keep"
        variant="destructive"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </ContentContainer>
  );
}
