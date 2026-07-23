"use client";

import { toast } from "sonner";
import { useState } from "react";

import { FormDialog } from "@/components/shared/form-dialog";
import { JobForm } from "@/features/jobs/components/job-form";
import {
  createJobAction,
  updateJobAction,
} from "@/features/jobs/actions/jobs.actions";
import type { JobFormValues } from "@/features/jobs/schemas/job.schema";
import type { Job } from "@/features/jobs/types";
import type { LookupOption } from "@/services/lookups";

interface JobDialogProps {
  open: boolean;
  mode: "create" | "edit";
  job?: Job | null;
  clients: LookupOption[];
  accountManagers: LookupOption[];
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function JobDialog({
  open,
  mode,
  job,
  clients,
  accountManagers,
  onOpenChange,
  onCompleted,
}: JobDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: JobFormValues) {
    setSubmitting(true);
    try {
      const result =
        mode === "create"
          ? await createJobAction(values)
          : await updateJobAction(job!.id, values);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(mode === "create" ? "Job created" : "Job updated");
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
      title={mode === "create" ? "Create Job" : "Edit Job"}
      description={
        mode === "create"
          ? "Add a new hiring requirement."
          : "Update job details."
      }
    >
      <JobForm
        key={job?.id ?? "create"}
        clients={clients}
        accountManagers={accountManagers}
        initialJob={mode === "edit" ? job : null}
        submitting={submitting}
        submitLabel={mode === "create" ? "Create Job" : "Save Changes"}
        onCancel={() => onOpenChange(false)}
        onSubmit={handleSubmit}
      />
    </FormDialog>
  );
}
