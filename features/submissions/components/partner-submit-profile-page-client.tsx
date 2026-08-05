"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Search } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CandidateForm } from "@/features/candidates/components/candidate-form";
import { appendCandidateFormFields } from "@/features/candidates/lib/candidate-form-data";
import type { CandidateFormValues } from "@/features/candidates/schemas/candidate.schema";
import type { Candidate } from "@/features/candidates/types";
import { submitCandidateAction } from "@/features/submissions/actions/submissions.actions";
import type { PartnerWorkTask } from "@/features/tasks/types";
import { signalLiveDataChange } from "@/lib/live-sync";
import { cn } from "@/lib/utils";

interface PartnerSubmitProfilePageClientProps {
  tasks: PartnerWorkTask[];
}

function taskSearchBlob(task: PartnerWorkTask): string {
  return [
    task.jobTitle,
    task.jobCode,
    task.clientName,
    task.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function taskLabel(task: PartnerWorkTask): string {
  const code = task.jobCode?.trim();
  const client = task.clientName?.trim();
  const parts = [
    code ? `${code} — ${task.jobTitle}` : task.jobTitle,
    client,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function PartnerSubmitProfilePageClient({
  tasks,
}: PartnerSubmitProfilePageClientProps) {
  const router = useRouter();
  const submittingLock = useRef(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [selectedId, setSelectedId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingValues, setPendingValues] =
    useState<CandidateFormValues | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [duplicates, setDuplicates] = useState<Candidate[]>([]);

  const filtered = useMemo(() => {
    if (!deferredQuery) {
      return tasks;
    }
    return tasks.filter((task) =>
      taskSearchBlob(task).includes(deferredQuery),
    );
  }, [tasks, deferredQuery]);

  const selected =
    filtered.find((task) => task.id === selectedId) ??
    tasks.find((task) => task.id === selectedId) ??
    null;

  const jobOptions = useMemo(() => {
    if (!selected || filtered.some((task) => task.id === selected.id)) {
      return filtered;
    }
    return [selected, ...filtered];
  }, [filtered, selected]);

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
    if (!selected || submittingLock.current) {
      return;
    }
    submittingLock.current = true;

    const formData = new FormData();
    formData.set("jobId", selected.jobId);
    formData.set("allocationId", selected.allocationId);
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

      toast.success(
        result.data &&
          typeof result.data === "object" &&
          "reusedCandidate" in result.data &&
          result.data.reusedCandidate
          ? "Existing candidate submitted"
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
            1. Choose the job
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Search by job title, job code, or client, then select the JD to tag
            this profile.
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search job title, code, or client…"
            className="pl-9"
            aria-label="Search jobs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="submit-job">Job description</Label>
          <Select
            id="submit-job"
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value);
              resetDuplicateState();
            }}
            disabled={submitting}
          >
            <option value="">Select a job…</option>
            {jobOptions.map((task) => (
              <option key={task.id} value={task.id}>
                {taskLabel(task)}
                {task.remainingProfiles > 0
                  ? ` (${task.remainingProfiles} remaining)`
                  : ""}
              </option>
            ))}
          </Select>
          {filtered.length === 0 && !selected ? (
            <p className="text-sm text-muted-foreground">
              No jobs match “{query.trim()}”. Clear the search or pick another
              term.
            </p>
          ) : null}
        </div>

        {selected ? (
          <div
            className={cn(
              "rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm",
            )}
          >
            <p className="font-medium text-foreground">{selected.jobTitle}</p>
            <p className="mt-0.5 text-muted-foreground">
              {[selected.jobCode, selected.clientName, selected.location]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selected.submittedProfiles} submitted
              {selected.expectedProfiles > 0
                ? ` · ${selected.remainingProfiles} of ${selected.expectedProfiles} remaining`
                : null}
            </p>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            2. Candidate details
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selected
              ? `Submitting against ${selected.jobTitle}.`
              : "Select a job above to unlock the profile form."}
          </p>
        </div>

        {selected ? (
          <div className="rounded-2xl border border-border/80 bg-background p-4 sm:p-6">
            <CandidateForm
              key={`${selected.jobId}-${selected.allocationId}`}
              submitting={submitting}
              resumeRequired
              submitLabel="Submit Profile"
              onSubmit={(values, file) => postSubmission(values, file)}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 px-6 py-10 text-center text-sm text-muted-foreground">
            Choose a job first to continue.
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
