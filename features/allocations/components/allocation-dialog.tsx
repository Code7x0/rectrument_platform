"use client";

import { useState } from "react";
import { toast } from "sonner";

import { FormDialog } from "@/components/shared/form-dialog";
import {
  updateAllocationAction,
  type UpdateAllocationFormValues,
} from "@/features/allocations/actions/allocations.actions";
import { AllocationEditForm } from "@/features/allocations/components/allocation-edit-form";
import type { Allocation } from "@/features/allocations/types";

interface AllocationDialogProps {
  open: boolean;
  allocation: Allocation | null;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function AllocationDialog({
  open,
  allocation,
  onOpenChange,
  onCompleted,
}: AllocationDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: UpdateAllocationFormValues) {
    if (!allocation) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await updateAllocationAction(allocation.id, values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Allocation updated");
      onOpenChange(false);
      onCompleted();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Allocation"
      description="Update expected profiles, status, or notes. Job and Partner cannot change here."
    >
      {allocation ? (
        <AllocationEditForm
          key={allocation.id}
          allocation={allocation}
          submitting={submitting}
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </FormDialog>
  );
}
