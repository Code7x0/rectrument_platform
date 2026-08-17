"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import { CandidateForm } from "@/features/candidates/components/candidate-form";
import { appendCandidateFormFields } from "@/features/candidates/lib/candidate-form-data";
import type { CandidateFormValues } from "@/features/candidates/schemas/candidate.schema";
import type { Candidate } from "@/features/candidates/types";
import {
  listPartnerSubmitJobsAction,
  submitCandidateAction,
} from "@/features/submissions/actions/submissions.actions";
import {
  PartnerJobMultiSelect,
  type PartnerJobOption,
} from "@/features/submissions/components/partner-job-multi-select";
import { signalLiveDataChange } from "@/lib/live-sync";

interface SubmitCandidateDialogProps {
  open: boolean;
  jobId: string;
  allocationId: string;
  jobTitle: string;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

export function SubmitCandidateDialog({
  open,
  jobId,
  allocationId,
  jobTitle,
  onOpenChange,
  onCompleted,
}: SubmitCandidateDialogProps) {
  const router = useRouter();
  const submittingLock = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingValues, setPendingValues] =
    useState<CandidateFormValues | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [duplicates, setDuplicates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<PartnerJobOption[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setJobs([]);
      setSelectedTaskIds([]);
      return;
    }

    let cancelled = false;
    setJobsLoading(true);
    void listPartnerSubmitJobsAction().then((result) => {
      if (cancelled) {
        return;
      }
      setJobsLoading(false);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setJobs(result.data);
      const matched = result.data.filter(
        (task) =>
          task.jobId === jobId || task.allocationId === allocationId,
      );
      if (matched.length > 0) {
        setSelectedTaskIds(matched.map((task) => task.id));
      } else {
        const synthetic: PartnerJobOption = {
          id: `seed-${jobId}`,
          allocationId,
          jobId,
          jobTitle,
          jobCode: null,
          clientName: null,
          location: null,
          remainingProfiles: 0,
          submittedProfiles: 0,
        };
        setJobs([synthetic, ...result.data]);
        setSelectedTaskIds([synthetic.id]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, jobId, allocationId, jobTitle]);

  function resetDuplicateState() {
    setDuplicates([]);
    setPendingValues(null);
    setPendingFile(null);
  }

  async function postSubmission(
    values: CandidateFormValues,
    resumeFile: File | null,
    options?: { existingCandidateId?: string; reuseConfirmed?: boolean },
  ) {
    if (submittingLock.current) {
      return;
    }
    const selected = jobs.filter((task) => selectedTaskIds.includes(task.id));
    if (selected.length === 0) {
      toast.error("Select at least one job");
      return;
    }

    submittingLock.current = true;

    const formData = new FormData();
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

    if (options?.existingCandidateId) {
      formData.set("existingCandidateId", options.existingCandidateId);
    }
    if (options?.reuseConfirmed) {
      formData.set("reuseConfirmed", "true");
    }
    if (resumeFile) {
      formData.set("resume", resumeFile);
    }

    setSubmitting(true);
    try {
      const result = await submitCandidateAction(formData);
      if (!result.success) {
        if (result.duplicates?.length && !result.blocked) {
          setPendingValues(values);
          setPendingFile(resumeFile);
          setDuplicates(result.duplicates);
          return;
        }
        toast.error(result.message);
        return;
      }

      const jobCount =
        result.data &&
        typeof result.data === "object" &&
        "jobCount" in result.data &&
        typeof result.data.jobCount === "number"
          ? result.data.jobCount
          : selected.length;

      toast.success(
        result.data &&
          typeof result.data === "object" &&
          "reusedCandidate" in result.data &&
          result.data.reusedCandidate
          ? "Existing candidate submitted"
          : jobCount > 1
            ? `Candidate submitted to ${jobCount} jobs`
            : "Candidate submitted",
      );
      resetDuplicateState();
      onOpenChange(false);
      onCompleted?.();
      signalLiveDataChange();
      router.push("/partner/candidates");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Submission failed";
      const looksLikeBodyLimit =
        /body.*(limit|exceed)|1\s*mb|payload.*large|request entity too large/i.test(
          message,
        );
      toast.error(
        looksLikeBodyLimit
          ? "Resume is too large for upload (max 8MB). Try a smaller PDF or Word file."
          : message || "Could not submit candidate. Please try again.",
      );
    } finally {
      submittingLock.current = false;
      setSubmitting(false);
    }
  }

  async function handleReuse() {
    const match = duplicates[0];
    if (!match || !pendingValues) {
      return;
    }

    await postSubmission(pendingValues, pendingFile, {
      existingCandidateId: match.id,
      reuseConfirmed: true,
    });
  }

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          if (submitting) {
            return;
          }
          if (!next) {
            resetDuplicateState();
          }
          onOpenChange(next);
        }}
        title="Submit Candidate"
        description={`Submit a candidate for ${jobTitle}${selectedTaskIds.length > 1 ? " and other selected jobs" : ""}. Screening notes are optional.`}
        className="h-[min(92vh,52rem)] sm:max-w-2xl"
        bodyLayout="split"
      >
        {jobsLoading ? (
          <div className="px-6 py-10 text-sm text-[#64748B]">Loading jobs…</div>
        ) : (
          <CandidateForm
            key={`${jobId}-${allocationId}-${open ? "open" : "closed"}`}
            submitting={submitting}
            resumeRequired
            topSlot={
              <PartnerJobMultiSelect
                jobs={jobs}
                selectedTaskIds={selectedTaskIds}
                onChange={setSelectedTaskIds}
                disabled={submitting}
                label="Jobs"
                hint="This job is pre-selected. Add more allocated jobs if the profile fits them too."
              />
            }
            onCancel={() => {
              if (!submitting) {
                onOpenChange(false);
              }
            }}
            onSubmit={(values, file) => postSubmission(values, file)}
            submitLabel={
              selectedTaskIds.length > 1
                ? `Submit to ${selectedTaskIds.length} jobs`
                : "Submit Candidate"
            }
          />
        )}
      </FormDialog>

      <ConfirmDialog
        open={duplicates.length > 0}
        onOpenChange={(next) => {
          if (!next) {
            resetDuplicateState();
          }
        }}
        title="Candidate already exists"
        description={
          <span>
            We found{" "}
            <strong>{duplicates[0]?.fullName ?? "a matching candidate"}</strong>
            {duplicates[0]?.email ? ` (${duplicates[0].email})` : ""}. Submit
            using this existing profile instead of creating a duplicate?
          </span>
        }
        confirmLabel="Reuse & Submit"
        cancelLabel="Edit details"
        loading={submitting}
        onConfirm={handleReuse}
      />
    </>
  );
}
