"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import { CandidateForm } from "@/features/candidates/components/candidate-form";
import type { CandidateFormValues } from "@/features/candidates/schemas/candidate.schema";
import type { Candidate } from "@/features/candidates/types";
import { submitCandidateAction } from "@/features/submissions/actions/submissions.actions";
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
    submittingLock.current = true;

    const formData = new FormData();
    formData.set("jobId", jobId);
    formData.set("allocationId", allocationId);
    formData.set("fullName", values.fullName);
    formData.set("email", values.email);
    formData.set("phone", values.phone);
    formData.set("currentLocation", values.currentLocation ?? "");
    formData.set("currentCtc", values.currentCtc ?? "");
    formData.set("expectedCtc", values.expectedCtc ?? "");
    formData.set("noticePeriod", values.noticePeriod ?? "");
    formData.set("linkedIn", values.linkedIn ?? "");
    // Unused on the simplified form — keep empty for Airtable compatibility.
    formData.set("currentCompany", "");
    formData.set("experience", "");
    formData.set("skills", "");
    formData.set("remarks", "");

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
        if (result.duplicates?.length) {
          setPendingValues(values);
          setPendingFile(resumeFile);
          setDuplicates(result.duplicates);
          return;
        }
        toast.error(result.message);
        return;
      }

      toast.success(
        result.data &&
          typeof result.data === "object" &&
          "reusedCandidate" in result.data &&
          result.data.reusedCandidate
          ? "Existing candidate submitted"
          : "Candidate submitted",
      );
      resetDuplicateState();
      onOpenChange(false);
      onCompleted?.();
      signalLiveDataChange();
      // Navigate once — destination RSC load is fresh; avoid double refresh.
      router.push("/partner/candidates");
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
        description={`Quick submit for ${jobTitle}. Required fields take under a minute.`}
        className="sm:max-w-xl"
      >
        <CandidateForm
          key={`${jobId}-${allocationId}-${open ? "open" : "closed"}`}
          submitting={submitting}
          resumeRequired
          onCancel={() => {
            if (!submitting) {
              onOpenChange(false);
            }
          }}
          onSubmit={(values, file) => postSubmission(values, file)}
        />
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
