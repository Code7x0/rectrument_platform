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
import { updateSubmissionReviewFieldsAction } from "@/features/submissions/actions/review-fields.actions";
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

function resolveAirtableStatusValue(submission: Submission): string {
  if (submission.airtableStatus?.trim()) {
    return submission.airtableStatus.trim();
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
  const [remarks, setRemarks] = useState(submission.remarks ?? "");
  const [internalFeedback, setInternalFeedback] = useState(
    submission.internalFeedback ?? "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAirtableStatus(resolveAirtableStatusValue(submission));
    setInterviewStage(submission.interviewStage ?? "");
    setRemarks(submission.remarks ?? "");
    setInternalFeedback(submission.internalFeedback ?? "");
  }, [
    submission.id,
    submission.airtableStatus,
    submission.status,
    submission.interviewStage,
    submission.remarks,
    submission.internalFeedback,
  ]);

  const timeline = buildCandidateTimeline(submission, activities);
  const currentStatusValue = resolveAirtableStatusValue(submission);
  const dirty =
    airtableStatus !== currentStatusValue ||
    interviewStage !== (submission.interviewStage ?? "") ||
    remarks !== (submission.remarks ?? "") ||
    internalFeedback !== (submission.internalFeedback ?? "");

  // Ensure current Airtable value appears even if it differs slightly from catalog.
  const statusOptions = (() => {
    const options = [...AIRTABLE_SUBMISSION_STATUS_OPTIONS];
    if (airtableStatus && !options.includes(airtableStatus as (typeof options)[number])) {
      options.unshift(airtableStatus as (typeof options)[number]);
    }
    return options;
  })();

  async function save() {
    if (!canEdit || !dirty) {
      return;
    }
    setSaving(true);
    try {
      const result = await updateSubmissionReviewFieldsAction(submission.id, {
        airtableStatus,
        interviewStage: interviewStage || null,
        remarks,
        internalFeedback,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Candidate progress saved");
      onUpdated?.(result.data);
      signalLiveDataChange();
    } finally {
      setSaving(false);
    }
  }

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
              onChange={(event) => setAirtableStatus(event.target.value)}
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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`stage-${submission.id}`}>Interview Stage</Label>
          {canEdit ? (
            <Select
              id={`stage-${submission.id}`}
              value={interviewStage || ""}
              onChange={(event) => setInterviewStage(event.target.value)}
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
        </div>

        <CandidateTimeline steps={timeline} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[#0F172A]">Review Details</h3>

        <div className="space-y-1.5">
          <Label htmlFor={`notes-${submission.id}`}>
            Screening Matrix Notes
          </Label>
          {canEdit ? (
            <Textarea
              id={`notes-${submission.id}`}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              rows={4}
              placeholder="Fitment notes, relocation, job-change reasons…"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-[#0F172A]">
              {submission.remarks || "—"}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`feedback-${submission.id}`}>Internal Feedback</Label>
          {canEdit ? (
            <Textarea
              id={`feedback-${submission.id}`}
              value={internalFeedback}
              onChange={(event) => setInternalFeedback(event.target.value)}
              rows={4}
              placeholder="Internal feedback for the hiring team…"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-[#0F172A]">
              {submission.internalFeedback || "—"}
            </p>
          )}
        </div>

        {canEdit ? (
          <Button
            type="button"
            disabled={!dirty || saving}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save progress"}
          </Button>
        ) : null}

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
