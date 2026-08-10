"use client";

import { useState } from "react";
import { toast } from "sonner";

import { FormDialog } from "@/components/shared/form-dialog";
import { allocatePartnerAction } from "@/features/allocations/actions/allocations.actions";
import { AllocatePartnerForm } from "@/features/allocations/components/allocate-partner-form";
import type { AllocatePartnerFormValues } from "@/features/allocations/schemas/allocation.schema";
import type { Job } from "@/features/jobs/types";
import { signalLiveDataChange } from "@/lib/live-sync";
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

      const createdCount = result.data.created.length;
      const skippedCount = result.data.skipped.length;
      const failedCount = result.data.failed.length;

      if (createdCount === 1 && skippedCount === 0 && failedCount === 0) {
        toast.success("Talent partner allocated");
      } else if (createdCount > 0) {
        const parts = [`${createdCount} partner${createdCount === 1 ? "" : "s"} allocated`];
        if (skippedCount > 0) {
          parts.push(`${skippedCount} already assigned`);
        }
        if (failedCount > 0) {
          parts.push(`${failedCount} failed`);
        }
        toast.success(parts.join(" · "));
      }

      signalLiveDataChange();
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
      title="Allocate Talent Partners"
      description="Assign one or more recruiting partners to this job in a single step. Allocations always start from a Job."
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
