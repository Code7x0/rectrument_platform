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
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const [submitting, setSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
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
      setLoadingProfile(false);
      setLoadingJobs(false);
      return;
    }

    let cancelled = false;
    setLoadingProfile(true);
    setLoadingJobs(true);

    void getOwnSubmissionForEditAction(submissionId)
      .then((editResult) => {
        if (cancelled) {
          return;
        }
        setLoadingProfile(false);
        if (!editResult.success) {
          toast.error(editResult.message);
          onOpenChangeRef.current(false);
          return;
        }

        const submission = editResult.data.submission;
        setFormValues(editResult.data.form);
        setResumeUrl(editResult.data.resumeUrl);
        setResumeFilename(editResult.data.resumeFilename);
        setCurrentJobId(submission.jobId);

        return listPartnerSubmitJobsAction().then((jobsResult) => {
          if (cancelled) {
            return;
          }
          setLoadingJobs(false);
          if (!jobsResult.success) {
            toast.error(jobsResult.message);
            return;
          }

          const jobOptions = jobsResult.data;
          setJobs(jobOptions);

          const matched = jobOptions.filter(
            (task) =>
              task.jobId === submission.jobId ||
              task.allocationId === submission.allocationId,
          );
          if (matched.length > 0) {
            setSelectedTaskIds(matched.map((task) => task.id));
          } else if (submission.jobId) {
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
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setLoadingProfile(false);
        setLoadingJobs(false);
        toast.error(
          error instanceof Error ? error.message : "Unable to load candidate",
        );
        onOpenChangeRef.current(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, submissionId]);

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
      {loadingProfile || !formValues ? (
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
            loadingJobs && jobs.length === 0 ? (
              <p className="text-xs text-[#64748B]">Loading your jobs…</p>
            ) : (
              <PartnerJobMultiSelect
                jobs={jobs}
                selectedTaskIds={selectedTaskIds}
                onChange={setSelectedTaskIds}
                disabled={submitting || loadingJobs}
                label="Jobs"
                hint={
                  currentJobId
                    ? "Change or add allocated jobs. Deselecting a job removes that unreviewed submission for this person."
                    : "Select one or more of your allocated jobs."
                }
              />
            )
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
