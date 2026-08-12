"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { CandidateForm } from "@/features/candidates/components/candidate-form";
import { appendCandidateFormFields } from "@/features/candidates/lib/candidate-form-data";
import type { CandidateFormValues } from "@/features/candidates/schemas/candidate.schema";
import type { Candidate } from "@/features/candidates/types";
import { submitCandidateAction } from "@/features/submissions/actions/submissions.actions";
import {
  PartnerJobMultiSelect,
  partnerJobOptionLabel,
} from "@/features/submissions/components/partner-job-multi-select";
import type { PartnerWorkTask } from "@/features/tasks/types";
import { signalLiveDataChange } from "@/lib/live-sync";

interface PartnerSubmitProfilePageClientProps {
  tasks: PartnerWorkTask[];
}

export function PartnerSubmitProfilePageClient({
  tasks,
}: PartnerSubmitProfilePageClientProps) {
  const router = useRouter();
  const submittingLock = useRef(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pendingValues, setPendingValues] =
    useState<CandidateFormValues | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [duplicates, setDuplicates] = useState<Candidate[]>([]);

  const selectedTasks = tasks.filter((task) =>
    selectedTaskIds.includes(task.id),
  );

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
    if (selectedTasks.length === 0 || submittingLock.current) {
      if (selectedTasks.length === 0) {
        toast.error("Select at least one job");
      }
      return;
    }
    submittingLock.current = true;

    const formData = new FormData();
    formData.set(
      "jobSelections",
      JSON.stringify(
        selectedTasks.map((task) => ({
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
        if (result.duplicates?.length) {
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
          : selectedTasks.length;

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

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No jobs ready for submission"
        description="You need an active job allocation before you can submit a profile. Open Assigned Jobs to see what’s available."
        icon={<Briefcase className="h-5 w-5" />}
        action={
          <Button asChild>
            <Link href="/partner/jobs">Go to Assigned Jobs</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            1. Choose job(s)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select one or more of your allocated jobs if this profile fits
            multiple roles.
          </p>
        </div>

        <PartnerJobMultiSelect
          jobs={tasks}
          selectedTaskIds={selectedTaskIds}
          onChange={(next) => {
            setSelectedTaskIds(next);
            resetDuplicateState();
          }}
          disabled={submitting}
          label="Job descriptions"
          hint="Only your active allocated jobs are listed."
        />

        {selectedTasks.length > 0 ? (
          <ul className="space-y-2 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
            {selectedTasks.map((task) => (
              <li key={task.id}>
                <p className="font-medium text-foreground">
                  {partnerJobOptionLabel(task)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {task.submittedProfiles} submitted
                  {task.remainingProfiles > 0
                    ? ` · ${task.remainingProfiles} remaining`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            2. Candidate details
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedTasks.length > 0
              ? selectedTasks.length === 1
                ? `Submitting against ${selectedTasks[0]!.jobTitle}.`
                : `Submitting against ${selectedTasks.length} jobs.`
              : "Select at least one job above to unlock the profile form."}
          </p>
        </div>

        {selectedTasks.length > 0 ? (
          <div className="rounded-2xl border border-border/80 bg-background p-4 sm:p-6">
            <CandidateForm
              key={selectedTaskIds.join("|")}
              submitting={submitting}
              resumeRequired
              submitLabel={
                selectedTasks.length > 1
                  ? `Submit to ${selectedTasks.length} jobs`
                  : "Submit Profile"
              }
              onSubmit={(values, file) => postSubmission(values, file)}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 px-6 py-10 text-center text-sm text-muted-foreground">
            Choose at least one job first to continue.
          </div>
        )}
      </section>

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
    </div>
  );
}
