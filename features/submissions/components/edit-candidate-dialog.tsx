"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FormDialog } from "@/components/shared/form-dialog";
import { CandidateForm } from "@/features/candidates/components/candidate-form";
import { appendCandidateFormFields } from "@/features/candidates/lib/candidate-form-data";
import type { CandidateFormValues } from "@/features/candidates/schemas/candidate.schema";
import {
  getOwnSubmissionForEditAction,
  listPartnerSubmitJobsAction,
  updateOwnCandidateAction,
} from "@/features/submissions/actions/submissions.actions";
import {
  PartnerJobMultiSelect,
  type PartnerJobOption,
} from "@/features/submissions/components/partner-job-multi-select";
import type { Submission } from "@/features/submissions/types";
import { signalLiveDataChange } from "@/lib/live-sync";

interface EditCandidateDialogProps {
  open: boolean;
  submissionId: string | null;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (submission: Submission) => void;
}

export function EditCandidateDialog({
  open,
  submissionId,
  onOpenChange,
  onUpdated,
}: EditCandidateDialogProps) {
  const router = useRouter();
  const submittingLock = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState<CandidateFormValues | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);
  const [jobs, setJobs] = useState<PartnerJobOption[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !submissionId) {
      setFormValues(null);
      setResumeUrl(null);
      setResumeFilename(null);
      setJobs([]);
      setSelectedTaskIds([]);
      setCurrentJobId(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void Promise.all([
      getOwnSubmissionForEditAction(submissionId),
      listPartnerSubmitJobsAction(),
    ]).then(([editResult, jobsResult]) => {
      if (cancelled) {
        return;
      }
      setLoading(false);
      if (!editResult.success) {
        toast.error(editResult.message);
        onOpenChange(false);
        return;
      }
      if (!jobsResult.success) {
        toast.error(jobsResult.message);
        onOpenChange(false);
        return;
      }

      const submission = editResult.data.submission;
      const jobOptions = jobsResult.data;
      setFormValues(editResult.data.form);
      setResumeUrl(editResult.data.resumeUrl);
      setResumeFilename(editResult.data.resumeFilename);
      setJobs(jobOptions);
      setCurrentJobId(submission.jobId);

      const matched = jobOptions.filter(
        (task) =>
          task.jobId === submission.jobId ||
          task.allocationId === submission.allocationId,
      );
      if (matched.length > 0) {
        setSelectedTaskIds(matched.map((task) => task.id));
      } else if (submission.jobId) {
        // Job may be inactive — still show a synthetic option so save can keep it.
        const synthetic: PartnerJobOption = {
          id: `current-${submission.jobId}`,
          allocationId: submission.allocationId,
          jobId: submission.jobId,
          jobTitle: submission.jobTitle ?? "Current job",
          jobCode: submission.jobCode,
          clientName: submission.clientName,
          location: null,
          remainingProfiles: 0,
          submittedProfiles: 0,
        };
        setJobs([synthetic, ...jobOptions]);
        setSelectedTaskIds([synthetic.id]);
      } else {
        setSelectedTaskIds([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, submissionId, onOpenChange]);

  async function handleSubmit(
    values: CandidateFormValues,
    resumeFile: File | null,
    options?: { removeResume?: boolean },
  ) {
    if (!submissionId || submittingLock.current) {
      return;
    }
    const selected = jobs.filter((task) => selectedTaskIds.includes(task.id));
    if (selected.length === 0) {
      toast.error("Select at least one job");
      return;
    }

    submittingLock.current = true;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("submissionId", submissionId);
      formData.set(
        "jobSelections",
        JSON.stringify(
          selected.map((task) => ({
            jobId: task.jobId,
            allocationId: task.allocationId,
          })),
        ),
      );
      appendCandidateFormFields(formData, values);
      if (resumeFile) {
        formData.set("resume", resumeFile);
      } else if (options?.removeResume) {
        formData.set("removeResume", "true");
      }
      const result = await updateOwnCandidateAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(
        selected.length > 1
          ? "Candidate updated across selected jobs"
          : "Candidate updated",
      );
      onUpdated?.(result.data);
      onOpenChange(false);
      signalLiveDataChange();
      router.refresh();
    } finally {
      submittingLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) {
          return;
        }
        onOpenChange(next);
      }}
      title="Edit Candidate"
      description="You can edit this profile and its jobs until internal review starts."
      className="h-[min(92vh,52rem)] sm:max-w-2xl"
      bodyLayout="split"
    >
      {loading || !formValues ? (
        <div className="px-6 py-10 text-sm text-[#64748B]">Loading profile…</div>
      ) : (
        <CandidateForm
          key={submissionId ?? "edit"}
          defaultValues={formValues}
          submitting={submitting}
          resumeRequired={false}
          currentResumeUrl={resumeUrl}
          currentResumeFilename={resumeFilename}
          allowRemoveResume
          submitLabel="Save changes"
          submittingLabel="Saving…"
          topSlot={
            <PartnerJobMultiSelect
              jobs={jobs}
              selectedTaskIds={selectedTaskIds}
              onChange={setSelectedTaskIds}
              disabled={submitting}
              label="Jobs"
              hint={
                currentJobId
                  ? "Change or add allocated jobs. Deselecting a job removes that unreviewed submission for this person."
                  : "Select one or more of your allocated jobs."
              }
            />
          }
          onCancel={() => {
            if (!submitting) {
              onOpenChange(false);
            }
          }}
          onSubmit={handleSubmit}
        />
      )}
    </FormDialog>
  );
}
