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
  updateOwnCandidateAction,
} from "@/features/submissions/actions/submissions.actions";
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

  useEffect(() => {
    if (!open || !submissionId) {
      setFormValues(null);
      setResumeUrl(null);
      setResumeFilename(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void getOwnSubmissionForEditAction(submissionId).then((result) => {
      if (cancelled) {
        return;
      }
      setLoading(false);
      if (!result.success) {
        toast.error(result.message);
        onOpenChange(false);
        return;
      }
      setFormValues(result.data.form);
      setResumeUrl(result.data.resumeUrl);
      setResumeFilename(result.data.resumeFilename);
    });

    return () => {
      cancelled = true;
    };
  }, [open, submissionId, onOpenChange]);

  async function handleSubmit(values: CandidateFormValues, resumeFile: File | null) {
    if (!submissionId || submittingLock.current) {
      return;
    }
    submittingLock.current = true;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("submissionId", submissionId);
      appendCandidateFormFields(formData, values);
      if (resumeFile) {
        formData.set("resume", resumeFile);
      }
      const result = await updateOwnCandidateAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Candidate updated");
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
      description="You can edit this profile until internal review starts."
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
          submitLabel="Save changes"
          submittingLabel="Saving…"
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
