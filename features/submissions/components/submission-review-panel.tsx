"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { CandidateTimeline } from "@/features/submissions/components/candidate-timeline";
import { SecondLevelReviewBadge } from "@/features/submissions/components/second-level-review-badge";
import { SubmissionStatusBadge } from "@/features/submissions/components/submission-status-badge";
import { buildCandidateTimeline } from "@/features/submissions/lib/candidate-timeline";
import { parseScreeningMatrixNotes } from "@/features/submissions/lib/build-screening-matrix-notes";
import { updateSubmissionReviewFieldsAction } from "@/features/submissions/actions/review-fields.actions";
import type { UpdateSubmissionReviewFieldsInput } from "@/features/submissions/services";
import type { Submission } from "@/features/submissions/types";
import { SUBMISSION_STATUS_LABELS } from "@/features/shared/entities";
import {
  AIRTABLE_INTERVIEW_STAGES,
  AIRTABLE_SUBMISSION_STATUS_OPTIONS,
  DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE,
} from "@/lib/airtable/fields";
import { signalLiveDataChange } from "@/lib/live-sync";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Activity } from "@/features/workflows/types";

interface SubmissionReviewPanelProps {
  submission: Submission;
  canEdit: boolean;
  activities?: Activity[];
  onUpdated?: (next: Submission) => void;
}

function NoteBlock({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) {
    return null;
  }
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-[#0F172A]">{value}</p>
    </div>
  );
}

function ScreeningMatrixNotes({ text }: { text: string | null | undefined }) {
  const parsed = parseScreeningMatrixNotes(text);
  const skillLines = parsed.skillScreens
    .map((row) => {
      const skill = row.skill?.trim() ?? "";
      const years = row.years?.trim() ?? "";
      const alternate = row.alternate?.trim() ?? "";
      if (!skill && !years && !alternate) {
        return null;
      }
      if (skill && alternate) {
        return `${skill} — not using; alternate: ${alternate}${years ? ` (${years})` : ""}`;
      }
      if (skill && years) {
        return `${skill} — ${years}`;
      }
      if (skill) {
        return skill;
      }
      if (alternate) {
        return `alternate: ${alternate}${years ? ` (${years})` : ""}`;
      }
      return years;
    })
    .filter((line): line is string => Boolean(line));

  const raw = text?.trim() ?? "";
  const showStructured = Boolean(parsed.experience || skillLines.length > 0);

  if (!raw) {
    return (
      <p id="screening-matrix-notes" className="text-sm text-[#0F172A]">
        —
      </p>
    );
  }

  if (!showStructured) {
    return (
      <p
        id="screening-matrix-notes"
        className="whitespace-pre-wrap text-sm text-[#0F172A]"
      >
        {raw}
      </p>
    );
  }

  return (
    <div id="screening-matrix-notes" className="space-y-3">
      <NoteBlock label="Total experience" value={parsed.experience} />
      {skillLines.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
            Skills
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[#0F172A]">
            {skillLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <NoteBlock label="Additional notes" value={parsed.remarks} />
    </div>
  );
}

function resolveAirtableStatusValue(submission: Submission): string {
  if (submission.airtableStatus?.trim()) {
    return submission.airtableStatus;
  }
  return DOMAIN_SUBMISSION_STATUS_TO_AIRTABLE[submission.status];
}

export function SubmissionReviewPanel({
  submission,
  canEdit,
  activities = [],
  onUpdated,
}: SubmissionReviewPanelProps) {
  const [airtableStatus, setAirtableStatus] = useState(
    resolveAirtableStatusValue(submission),
  );
  const [interviewStage, setInterviewStage] = useState(
    submission.interviewStage ?? "",
  );
  const [internalFeedback, setInternalFeedback] = useState(
    submission.internalFeedback ?? "",
  );
  const [savingField, setSavingField] = useState<string | null>(null);

  useEffect(() => {
    setAirtableStatus(resolveAirtableStatusValue(submission));
    setInterviewStage(submission.interviewStage ?? "");
    setInternalFeedback(submission.internalFeedback ?? "");
  }, [
    submission.id,
    submission.airtableStatus,
    submission.status,
    submission.interviewStage,
    submission.internalFeedback,
  ]);

  const timeline = buildCandidateTimeline(submission, activities);
  const currentStatusValue = resolveAirtableStatusValue(submission);
  const currentStage = submission.interviewStage ?? "";
  const currentFeedback = submission.internalFeedback ?? "";
  const feedbackDirty = internalFeedback !== currentFeedback;

  const statusOptions = (() => {
    const options = [...AIRTABLE_SUBMISSION_STATUS_OPTIONS];
    if (
      airtableStatus &&
      !options.includes(airtableStatus as (typeof options)[number])
    ) {
      options.unshift(airtableStatus as (typeof options)[number]);
    }
    return options;
  })();

  async function savePatch(
    fieldKey: string,
    patch: UpdateSubmissionReviewFieldsInput,
    successMessage: string,
  ) {
    if (!canEdit || savingField) {
      return;
    }
    setSavingField(fieldKey);
    try {
      const result = await updateSubmissionReviewFieldsAction(
        submission.id,
        patch,
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(successMessage);
      onUpdated?.(result.data);
      signalLiveDataChange();
    } finally {
      setSavingField(null);
    }
  }

  async function saveStatus(nextStatus: string) {
    const previous = airtableStatus;
    setAirtableStatus(nextStatus);
    if (nextStatus === currentStatusValue) {
      return;
    }
    setSavingField("status");
    try {
      const result = await updateSubmissionReviewFieldsAction(submission.id, {
        airtableStatus: nextStatus,
      });
      if (!result.success) {
        setAirtableStatus(previous);
        toast.error(result.message);
        return;
      }
      toast.success("Submission status updated");
      onUpdated?.(result.data);
      signalLiveDataChange();
    } catch (error) {
      setAirtableStatus(previous);
      toast.error(
        error instanceof Error ? error.message : "Unable to update status",
      );
    } finally {
      setSavingField(null);
    }
  }

  async function saveStage(nextStage: string) {
    const previous = interviewStage;
    setInterviewStage(nextStage);
    if (nextStage === currentStage) {
      return;
    }
    setSavingField("stage");
    try {
      const result = await updateSubmissionReviewFieldsAction(submission.id, {
        interviewStage: nextStage || null,
      });
      if (!result.success) {
        setInterviewStage(previous);
        toast.error(result.message);
        return;
      }
      toast.success("Interview stage updated");
      onUpdated?.(result.data);
      signalLiveDataChange();
    } catch (error) {
      setInterviewStage(previous);
      toast.error(
        error instanceof Error ? error.message : "Unable to update stage",
      );
    } finally {
      setSavingField(null);
    }
  }

  async function saveNotes() {
    if (!feedbackDirty) {
      return;
    }
    await savePatch(
      "notes",
      { internalFeedback },
      "Guidance saved",
    );
  }

  const busy = Boolean(savingField);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SubmissionStatusBadge status={submission.status} />
        {submission.wantsSecondLevelReview ? <SecondLevelReviewBadge /> : null}
      </div>
      <p className="text-xs text-[#94A3B8]">
        Submitted{" "}
        {submission.submissionDate
          ? formatDateTime(submission.submissionDate)
          : "—"}
        {" · "}
        {submission.airtableStatus ||
          SUBMISSION_STATUS_LABELS[submission.status]}
      </p>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Candidate Progress
        </h3>

        <div className="space-y-1.5">
          <Label htmlFor={`status-${submission.id}`}>Submission Status</Label>
          {canEdit ? (
            <Select
              id={`status-${submission.id}`}
              value={airtableStatus}
              disabled={busy}
              onChange={(event) => void saveStatus(event.target.value)}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.trim()}
                </option>
              ))}
            </Select>
          ) : (
            <p className="text-sm text-[#0F172A]">
              {submission.airtableStatus ||
                SUBMISSION_STATUS_LABELS[submission.status]}
            </p>
          )}
          {savingField === "status" ? (
            <p className="text-xs text-[#64748B]">Saving status…</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`stage-${submission.id}`}>Interview Stage</Label>
          {canEdit ? (
            <Select
              id={`stage-${submission.id}`}
              value={interviewStage || ""}
              disabled={busy}
              onChange={(event) => void saveStage(event.target.value)}
            >
              <option value="">Not set</option>
              {AIRTABLE_INTERVIEW_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </Select>
          ) : (
            <p className="text-sm text-[#0F172A]">
              {submission.interviewStage || "—"}
            </p>
          )}
          {savingField === "stage" ? (
            <p className="text-xs text-[#64748B]">Saving interview stage…</p>
          ) : null}
        </div>

        <CandidateTimeline steps={timeline} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[#0F172A]">Review Details</h3>

        <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <div>
            <Label htmlFor="screening-matrix-notes">Screening Matrix</Label>
            <p className="mt-1 text-xs text-[#64748B]">
              Partner notes about the candidate. Only the partner can edit this.
            </p>
          </div>
          <ScreeningMatrixNotes text={submission.remarks} />
        </div>

        <div className="space-y-3 rounded-xl border border-[#E2E8F0] p-4">
          <div>
            <Label htmlFor={`feedback-${submission.id}`}>Internal Feedback</Label>
            <p className="mt-1 text-xs text-[#64748B]">
              {canEdit
                ? "AM / admin notes. You can update this at any stage. Partners can read this, not edit it."
                : "Notes from Talent Socio about this candidate."}
            </p>
          </div>
          {canEdit ? (
            <Textarea
              id={`feedback-${submission.id}`}
              value={internalFeedback}
              disabled={busy}
              onChange={(event) => setInternalFeedback(event.target.value)}
              rows={5}
              placeholder="Add internal feedback for the partner…"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-[#0F172A]">
              {submission.internalFeedback || "—"}
            </p>
          )}
          {canEdit ? (
            <Button
              type="button"
              disabled={!feedbackDirty || busy}
              onClick={() => void saveNotes()}
            >
              {savingField === "notes" ? "Saving…" : "Save internal feedback"}
            </Button>
          ) : null}
        </div>

        <p className="text-xs text-[#94A3B8]">
          Last known submission time{" "}
          {submission.submissionDate
            ? formatDate(submission.submissionDate)
            : "—"}
        </p>
      </section>
    </div>
  );
}
