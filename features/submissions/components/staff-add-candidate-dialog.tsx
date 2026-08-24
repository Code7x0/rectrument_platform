"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { FormDialog } from "@/components/shared/form-dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CandidateForm } from "@/features/candidates/components/candidate-form";
import { appendCandidateFormFields } from "@/features/candidates/lib/candidate-form-data";
import type { CandidateFormValues } from "@/features/candidates/schemas/candidate.schema";
import {
  listStaffSubmitJobsAction,
  staffSubmitCandidateAction,
  type StaffSubmitJobOption,
} from "@/features/submissions/actions/submissions.actions";
import { signalLiveDataChange } from "@/lib/live-sync";

interface StaffAddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

export function StaffAddCandidateDialog({
  open,
  onOpenChange,
  onCompleted,
}: StaffAddCandidateDialogProps) {
  const [jobs, setJobs] = useState<StaffSubmitJobOption[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState("");
  const [allocationId, setAllocationId] = useState("");
  const pathname = usePathname();
  const staffHome = pathname.startsWith("/account-manager")
    ? "/account-manager"
    : "/admin";

  useEffect(() => {
    if (!open) {
      setJobs([]);
      setJobId("");
      setAllocationId("");
      return;
    }

    let cancelled = false;
    setJobsLoading(true);
    void listStaffSubmitJobsAction().then((result) => {
      if (cancelled) {
        return;
      }
      setJobsLoading(false);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setJobs(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.jobId === jobId) ?? null,
    [jobs, jobId],
  );

  useEffect(() => {
    if (!selectedJob) {
      setAllocationId("");
      return;
    }
    if (
      selectedJob.allocations.some((row) => row.allocationId === allocationId)
    ) {
      return;
    }
    setAllocationId(selectedJob.allocations[0]?.allocationId ?? "");
  }, [selectedJob, allocationId]);

  async function handleSubmit(values: CandidateFormValues, file: File | null) {
    if (!jobId || !allocationId) {
      toast.error("Select a job and allocated Talent Partner");
      return;
    }
    if (!file) {
      toast.error("Resume is required");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      appendCandidateFormFields(formData, values);
      formData.set("jobId", jobId);
      formData.set("allocationId", allocationId);
      formData.set("resume", file);

      const result = await staffSubmitCandidateAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Candidate added");
      onOpenChange(false);
      signalLiveDataChange();
      onCompleted?.();
    } finally {
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
      title="Add Candidate"
      description="Use the same candidate form as Account Managers. Choose a job that already has an allocated Talent Partner."
      className="h-[min(92vh,52rem)] sm:max-w-2xl"
      bodyLayout="split"
    >
      {jobsLoading ? (
        <div className="px-6 py-10 text-sm text-[#64748B]">Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="space-y-4 px-6 py-8 text-sm text-[#334155]">
          <p>
            Add Candidate needs a job that already has an allocated Talent
            Partner. Allocate a partner first, then come back here.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`${staffHome}/jobs`}
              className="font-medium text-[#2563EB] hover:underline"
              onClick={() => onOpenChange(false)}
            >
              Open Jobs
            </Link>
            <Link
              href={`${staffHome}/allocations`}
              className="font-medium text-[#2563EB] hover:underline"
              onClick={() => onOpenChange(false)}
            >
              Open Allocations
            </Link>
          </div>
        </div>
      ) : (
        <CandidateForm
          key={open ? "open" : "closed"}
          submitting={submitting}
          resumeRequired
          topSlot={
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="staff-job">Job</Label>
                <Select
                  id="staff-job"
                  value={jobId}
                  disabled={submitting || jobs.length === 0}
                  onChange={(event) => setJobId(event.target.value)}
                >
                  <option value="">
                    {jobs.length === 0 ? "No allocated jobs" : "Select a job"}
                  </option>
                  {jobs.map((job) => (
                    <option key={job.jobId} value={job.jobId}>
                      {job.jobCode
                        ? `${job.jobCode} — ${job.jobTitle}`
                        : job.jobTitle}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-allocation">Talent Partner</Label>
                <Select
                  id="staff-allocation"
                  value={allocationId}
                  disabled={submitting || !selectedJob}
                  onChange={(event) => setAllocationId(event.target.value)}
                >
                  <option value="">Select partner</option>
                  {selectedJob?.allocations.map((row) => (
                    <option key={row.allocationId} value={row.allocationId}>
                      {row.partnerLabel}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          }
          onCancel={() => {
            if (!submitting) {
              onOpenChange(false);
            }
          }}
          onSubmit={handleSubmit}
          submitLabel="Add Candidate"
        />
      )}
    </FormDialog>
  );
}
