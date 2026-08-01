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
import { AIRTABLE_INTERVIEW_STAGES } from "@/lib/airtable/fields";
import { signalLiveDataChange } from "@/lib/live-sync";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Activity } from "@/features/workflows/types";

interface SubmissionReviewPanelProps {
  submission: Submission;
  canEdit: boolean;
  activities?: Activity[];
  onUpdated?: (next: Submission) => void;
}

export function SubmissionReviewPanel({
  submission,
  canEdit,
  activities = [],
  onUpdated,
}: SubmissionReviewPanelProps) {
  const [interviewStage, setInterviewStage] = useState(
    submission.interviewStage ?? "",
  );
  const [remarks, setRemarks] = useState(submission.remarks ?? "");
  const [internalFeedback, setInternalFeedback] = useState(
    submission.internalFeedback ?? "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setInterviewStage(submission.interviewStage ?? "");
    setRemarks(submission.remarks ?? "");
    setInternalFeedback(submission.internalFeedback ?? "");
  }, [
    submission.id,
    submission.interviewStage,
    submission.remarks,
    submission.internalFeedback,
  ]);

  const timeline = buildCandidateTimeline(submission, activities);
  const dirty =
    interviewStage !== (submission.interviewStage ?? "") ||
    remarks !== (submission.remarks ?? "") ||
    internalFeedback !== (submission.internalFeedback ?? "");

  async function save() {
    if (!canEdit || !dirty) {
      return;
    }
    setSaving(true);
    try {
      const result = await updateSubmissionReviewFieldsAction(submission.id, {
        interviewStage: interviewStage || null,
        remarks,
        internalFeedback,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Review fields saved");
      onUpdated?.(result.data);
      signalLiveDataChange();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <SubmissionStatusBadge status={submission.status} />
          {submission.wantsSecondLevelReview ? (
            <SecondLevelReviewBadge />
          ) : null}
        </div>
        <p className="text-xs text-[#94A3B8]">
          Submitted{" "}
          {submission.submissionDate
            ? formatDateTime(submission.submissionDate)
            : "—"}
          {" · "}
          Status: {SUBMISSION_STATUS_LABELS[submission.status]}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Candidate progress
        </h3>
        <CandidateTimeline steps={timeline} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[#0F172A]">Review details</h3>

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
            {saving ? "Saving…" : "Save review fields"}
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
