"use client";

import { useState } from "react";
import { toast } from "sonner";

import { FormDialog } from "@/components/shared/form-dialog";
import { allocatePartnerAction } from "@/features/allocations/actions/allocations.actions";
import { AllocatePartnerForm } from "@/features/allocations/components/allocate-partner-form";
import type { AllocatePartnerFormValues } from "@/features/allocations/schemas/allocation.schema";
import type { Job } from "@/features/jobs/types";
import type { LookupOption } from "@/services/lookups";

interface AllocatePartnerDialogProps {
  open: boolean;
  job: Job | null;
  partners: LookupOption[];
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function AllocatePartnerDialog({
  open,
  job,
  partners,
  onOpenChange,
  onCompleted,
}: AllocatePartnerDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: AllocatePartnerFormValues) {
    setSubmitting(true);
    try {
      const result = await allocatePartnerAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Talent partner allocated");
      onOpenChange(false);
      onCompleted();
    } finally {
      setSubmitting(false);
    }
  }

  const jobLabel = job
    ? `${job.jobCode} — ${job.title}`
    : "Job";

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Allocate Talent Partner"
      description="Assign a recruiting partner to this job. Allocations always start from a Job."
    >
      {job ? (
        <AllocatePartnerForm
          key={job.id}
          jobId={job.id}
          jobLabel={jobLabel}
          partners={partners}
          submitting={submitting}
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </FormDialog>
  );
}
