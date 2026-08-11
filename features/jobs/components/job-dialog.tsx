"use client";

import { toast } from "sonner";
import { useState } from "react";

import { DeleteDialog } from "@/components/shared/delete-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import { JobForm } from "@/features/jobs/components/job-form";
import {
  createJobAction,
  deleteJobAction,
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
  canDelete?: boolean;
  lockAccountManager?: boolean;
  defaultClientId?: string;
  lockClient?: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function JobDialog({
  open,
  mode,
  job,
  clients,
  accountManagers,
  canDelete = false,
  lockAccountManager = false,
  defaultClientId,
  lockClient = false,
  onOpenChange,
  onCompleted,
}: JobDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(
    values: JobFormValues,
    jdFile: File | null,
    sampleResumeFile: File | null,
  ) {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("payload", JSON.stringify(values));
      if (jdFile) {
        formData.set("jd", jdFile);
      }
      if (sampleResumeFile) {
        formData.set("sampleResume", sampleResumeFile);
      }

      const result =
        mode === "create"
          ? await createJobAction(formData)
          : await updateJobAction(job!.id, formData);

      if (!result.success) {
        toast.error(
          result.errors?.length
            ? `${result.message}: ${result.errors.join("; ")}`
            : result.message,
        );
        return;
      }

      toast.success(mode === "create" ? "Job created" : "Job updated");
      onOpenChange(false);
      onCompleted();
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!job) {
      return;
    }
    setDeleting(true);
    try {
      const result = await deleteJobAction(job.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Job deleted from Airtable");
      setDeleteOpen(false);
      onOpenChange(false);
      onCompleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
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
          lockAccountManager={lockAccountManager}
          defaultClientId={mode === "create" ? defaultClientId : undefined}
          lockClient={lockClient}
          submitting={submitting || deleting}
          submitLabel={mode === "create" ? "Create Job" : "Save Changes"}
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
          onDelete={
            mode === "edit" && canDelete && job
              ? () => setDeleteOpen(true)
              : undefined
          }
        />
      </FormDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={job?.title ?? "this job"}
        entityLabel="job"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
