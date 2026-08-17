"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { FilePreviewLink } from "@/components/shared/file-preview-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EntityActivityInline } from "@/features/activity/components/entity-activity-inline";
import type { Candidate } from "@/features/candidates/types";
import type { Job } from "@/features/jobs/types";
import { JOB_PRIORITY_LABELS } from "@/features/jobs/types";
import { SecondLevelReviewBadge } from "@/features/submissions/components/second-level-review-badge";
import { SubmissionReviewPanel } from "@/features/submissions/components/submission-review-panel";
import { SubmissionStatusBadge } from "@/features/submissions/components/submission-status-badge";
import type { Submission } from "@/features/submissions/types";
import { deleteSubmissionAction } from "@/features/submissions/actions/submissions.actions";
import { getReviewDetailAction } from "@/features/workflows/actions/review.actions";
import { signalLiveDataChange } from "@/lib/live-sync";
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
import {
  formatSkillScreensForDisplay,
  parseScreeningMatrixNotes,
} from "@/features/submissions/lib/build-screening-matrix-notes";
import { formatDate } from "@/lib/utils";

interface ReviewQueuePageClientProps {
  initialSubmissions: Submission[];
  canTransition: boolean;
  canDelete?: boolean;
  hideClientName?: boolean;
  breadcrumbs: Array<{ label: string; href?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  title?: string;
  description?: string;
  /** Deep-link from notifications — open this submission on mount. */
  initialSubmissionId?: string | null;
  /** Deep-link from job submitted-count links. */
  initialJobId?: string | null;
  /** Deep-link from dashboard cards — exact Airtable status (or pipe-separated). */
  initialStatus?: string | null;
  /** Deep-link from dashboard cards — named status group (pending_review, hold, …). */
  initialStatusGroup?: string | null;
  /**
   * Seed Client filter with owned accounts (AM), not only clients that already
   * have submissions in the current list.
   */
  clientFilterOptions?: Array<{ id: string; label: string }>;
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

const STATUS_GROUP_FILTER_OPTIONS: Array<{
  id: SubmissionStatusGroupId;
  label: string;
}> = [
  { id: "pending_review", label: "Pending Review (not reviewed)" },
  { id: "hold", label: "Hold" },
  { id: "internal_screening", label: "Internal Screening in Progress" },
  { id: "being_submitted", label: "Being Submitted to Client" },
  { id: "interviewing", label: "Interviewing" },
  { id: "selected", label: "Selected" },
  { id: "offers", label: "Offers" },
  { id: "joined", label: "Joined" },
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

function isAirtableRecordId(value: string | null | undefined): boolean {
  return Boolean(value && /^rec[a-zA-Z0-9]{10,}$/.test(value.trim()));
}

/** Prefer human labels; never surface raw Airtable record ids. */
function displayClientLabel(row: Submission): string {
  const name = row.clientName?.trim() || "";
  const code = row.clientCode?.trim() || "";
  if (name && !isAirtableRecordId(name)) {
    return name;
  }
  if (code && !isAirtableRecordId(code)) {
    return code;
  }
  const fromJobCode = row.jobCode?.split("_")[0]?.trim() || "";
  if (fromJobCode && !isAirtableRecordId(fromJobCode)) {
    return fromJobCode;
  }
  return "—";
}

function submissionStatusRank(row: Submission): number {
  const label =
    resolveAirtableSubmissionStatusOption(row.airtableStatus)?.trim() ||
    (row.airtableStatus ?? "").trim() ||
    "";
  const index = AIRTABLE_SUBMISSION_STATUS_OPTIONS.findIndex(
    (option) => option === label || option.trim() === label,
  );
  // Unknown statuses after catalog order, before empty.
  return index >= 0 ? index : AIRTABLE_SUBMISSION_STATUS_OPTIONS.length;
}

function sortSubmissionsForReview(rows: Submission[]): Submission[] {
  return [...rows].sort((a, b) => {
    const rankDiff = submissionStatusRank(a) - submissionStatusRank(b);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    const aTime = a.submissionDate ? Date.parse(a.submissionDate) : 0;
    const bTime = b.submissionDate ? Date.parse(b.submissionDate) : 0;
    return bTime - aTime;
  });
}

export function ReviewQueuePageClient({
  initialSubmissions,
  canTransition,
  canDelete = false,
  hideClientName = false,
  breadcrumbs,
  emptyTitle = "No submissions to review",
  emptyDescription = "New partner submissions will appear here.",
  title,
  description,
  initialSubmissionId = null,
  initialJobId = null,
  initialStatus = null,
  initialStatusGroup = null,
  clientFilterOptions = [],
}: ReviewQueuePageClientProps) {
  const router = useRouter();
  const [rows, setRows] = useState(initialSubmissions);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Submission | null>(null);
  const [deleting, setDeleting] = useState(false);
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
  const [clientFilter, setClientFilter] = useState("all");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [jobIdFilter, setJobIdFilter] = useState(initialJobId ?? "");
  const openedDeepLink = useRef<string | null>(null);

  useEffect(() => {
    setRows(initialSubmissions);
    // Keep an open review drawer in sync with Airtable / other-user updates.
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
    setJobIdFilter(initialJobId ?? "");
  }, [initialJobId]);

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

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    // Owned accounts first — GRW (etc.) must appear even with zero submissions.
    for (const option of clientFilterOptions) {
      const id = option.id?.trim();
      const label = option.label?.trim();
      if (!id || !label || label === "—") {
        continue;
      }
      map.set(id, label);
    }
    for (const row of rows) {
      if (!row.clientId) {
        continue;
      }
      const label = displayClientLabel(row);
      if (label === "—" || map.has(row.clientId)) {
        continue;
      }
      map.set(row.clientId, label);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows, clientFilterOptions]);

  const partnerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      if (!row.partnerId) {
        continue;
      }
      const label = row.partnerCode?.trim() || row.partnerId;
      if (!map.has(row.partnerId)) {
        map.set(row.partnerId, label);
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

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
    if (clientFilter !== "all") {
      next = next.filter((row) => row.clientId === clientFilter);
    }
    if (partnerFilter !== "all") {
      next = next.filter((row) => row.partnerId === partnerFilter);
    }
    if (jobIdFilter.trim()) {
      next = next.filter((row) => row.jobId === jobIdFilter.trim());
    }
    return sortSubmissionsForReview(next);
  }, [rows, statusFilter, jobTitleFilter, clientFilter, partnerFilter, jobIdFilter]);

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

  const selectedScreen = useMemo(() => {
    if (!selected) {
      return { experience: null as string | null, skills: null as string | null };
    }
    const parsed = parseScreeningMatrixNotes(selected.remarks);
    return {
      experience:
        candidate?.experience || parsed.experience || null,
      skills:
        candidate?.skills.join(", ") ||
        formatSkillScreensForDisplay(parsed.skillScreens) ||
        parsed.remarks ||
        selected.remarks ||
        null,
    };
  }, [selected, candidate]);

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

  useEffect(() => {
    const targetId = initialSubmissionId?.trim();
    if (!targetId || openedDeepLink.current === targetId) {
      return;
    }
    const row = initialSubmissions.find((item) => item.id === targetId);
    if (!row) {
      return;
    }
    openedDeepLink.current = targetId;
    void openReview(row);
  }, [initialSubmissionId, initialSubmissions]);

  function patchRow(next: Submission) {
    setRows((current) =>
      current.map((row) => (row.id === next.id ? { ...row, ...next } : row)),
    );
    setSelected((current) =>
      current?.id === next.id ? { ...current, ...next } : current,
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    const targetId = deleteTarget.id;
    setDeleting(true);
    try {
      const result = await deleteSubmissionAction(targetId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Candidate deleted");
      setRows((current) => current.filter((row) => row.id !== targetId));
      setDeleteTarget(null);
      if (selected?.id === targetId) {
        setSelected(null);
        setCandidate(null);
        setJob(null);
      }
      signalLiveDataChange();
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo<DataTableColumn<Submission>[]>(
    () => [
      {
        id: "candidate",
        header: "Candidate",
        cell: (row) => (
          <div className="space-y-1">
            <span className="font-medium text-[#0F172A]">
              {row.candidateName ?? "—"}
            </span>
            {row.wantsSecondLevelReview ? <SecondLevelReviewBadge /> : null}
          </div>
        ),
      },
      {
        id: "status",
        header: "Current Status",
        cell: (row) => (
          <SubmissionStatusBadge
            status={row.status}
            airtableStatus={row.airtableStatus}
            label={row.airtableStatus}
          />
        ),
      },
      {
        id: "jobCode",
        header: "Job ID",
        className: "text-[#64748B]",
        cell: (row) => row.jobCode || "—",
      },
      {
        id: "job",
        header: "Job",
        className: "text-[#64748B]",
        cell: (row) => row.jobTitle ?? "—",
      },
      {
        id: "client",
        header: "Client",
        className: "text-[#64748B]",
        cell: (row) => displayClientLabel(row),
      },
      {
        id: "partnerCode",
        header: "Partner Code",
        className: "text-[#64748B]",
        cell: (row) => row.partnerCode || "—",
      },
      ...(hideClientName
        ? []
        : [
            {
              id: "partner",
              header: "Partner",
              className: "text-[#64748B]",
              cell: (row: Submission) => row.partnerName ?? "—",
            },
          ]),
      {
        id: "date",
        header: "Submission Date",
        className: "text-[#64748B]",
        cell: (row) =>
          row.submissionDate ? formatDate(row.submissionDate) : "—",
      },
      {
        id: "stage",
        header: "Interview Stage",
        className: "text-[#64748B]",
        cell: (row) => row.interviewStage || "—",
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
        sticky: "right",
        className: "whitespace-nowrap",
        headerClassName: "whitespace-nowrap",
        cell: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Review submission"
              onClick={() => void openReview(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canDelete ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Delete candidate"
                onClick={() => setDeleteTarget(row)}
              >
                <Trash2 className="h-4 w-4 text-[#B91C1C]" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, hideClientName],
  );

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title={`${
          title ??
          (canTransition ? "Review Queue" : "Candidates")
        } (${filteredRows.length})`}
        description={
          description ??
          (canTransition
            ? "Candidates waiting for your review. Update status as interviews progress."
            : "All candidate submissions across the pipeline.")
        }
      />

      <div className="mb-4 grid gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="status-filter">Submission Status</Label>
          <Select
            id="status-filter"
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
          <Label htmlFor="client-filter">Client</Label>
          <Select
            id="client-filter"
            value={clientFilter}
            onChange={(event) => setClientFilter(event.target.value)}
          >
            <option value="all">All clients</option>
            {clientOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="job-title-filter">Job Title</Label>
          <Input
            id="job-title-filter"
            value={jobTitleFilter}
            onChange={(event) => setJobTitleFilter(event.target.value)}
            placeholder="Filter by job title"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="partner-filter">Partner</Label>
          <Select
            id="partner-filter"
            value={partnerFilter}
            onChange={(event) => setPartnerFilter(event.target.value)}
          >
            <option value="all">All partners</option>
            {partnerOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        getRowId={(row) => row.id}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
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
                    <Detail label="Experience" value={selectedScreen.experience} />
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
                      label="Screening Matrix"
                      value={selectedScreen.skills}
                    />
                  </div>
                  {(candidate?.resumeUrl || selected?.resumeUrl) ? (
                    <FilePreviewLink
                      asButton
                      url={candidate?.resumeUrl || selected?.resumeUrl}
                      filename={
                        candidate?.resumeFilename || selected?.resumeFilename
                      }
                      title={`${selected.candidateName ?? "Candidate"} resume`}
                    >
                      Preview Resume
                    </FilePreviewLink>
                  ) : (
                    <p className="text-sm text-[#64748B]">No resume on file</p>
                  )}
                  {(candidate?.linkedIn || selected?.linkedIn) ? (
                    <Button asChild variant="outline" size="sm" className="ml-2">
                      <a
                        href={
                          (candidate?.linkedIn || selected?.linkedIn) ?? "#"
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        LinkedIn
                      </a>
                    </Button>
                  ) : null}
                </section>

                <SubmissionReviewPanel
                  submission={selected}
                  canEdit={canTransition}
                  onUpdated={patchRow}
                />

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#0F172A]">
                    Job Details
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Detail
                      label="Job ID"
                      value={job?.jobCode || selected.jobCode}
                    />
                    <Detail
                      label="Job"
                      value={job?.title ?? selected.jobTitle}
                    />
                    <Detail
                      label="Partner Code"
                      value={selected.partnerCode}
                    />
                    <Detail
                      label="Client"
                      value={
                        job?.clientName ||
                        selected.clientName ||
                        selected.clientCode ||
                        job?.clientCode
                      }
                    />
                    <Detail label="Location" value={job?.location} />
                    <Detail label="Partner" value={selected.partnerName} />
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
              </>
            )}

            {canDelete ? (
              <div className="border-t border-[#E2E8F0] pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteTarget(selected)}
                >
                  Delete candidate
                </Button>
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
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Delete candidate"
        description={
          deleteTarget
            ? `Permanently delete ${deleteTarget.candidateName ?? "this candidate"}? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </ContentContainer>
  );
}
