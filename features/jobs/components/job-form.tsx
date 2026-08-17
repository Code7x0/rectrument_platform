"use client";

import { useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { FilePreviewLink } from "@/components/shared/file-preview-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { removeJobAttachmentAction } from "@/features/jobs/actions/jobs.actions";
import {
  JOB_WORK_MODE_OPTIONS,
  jobFormSchema,
  type JobFormValues,
} from "@/features/jobs/schemas/job.schema";
import { deriveJobWorkMode } from "@/features/jobs/lib/work-mode";
import type { Job, JobDocument } from "@/features/jobs/types";
import { DOCUMENT_ACCEPT } from "@/lib/files/document-types";
import type { LookupOption } from "@/services/lookups";

interface JobFormProps {
  clients: LookupOption[];
  accountManagers: LookupOption[];
  initialJob?: Job | null;
  submitting?: boolean;
  /** Account Managers own the job — AM field is locked to themselves. */
  lockAccountManager?: boolean;
  defaultClientId?: string;
  lockClient?: boolean;
  onSubmit: (
    values: JobFormValues,
    jdFile: File | null,
    sampleResumeFile: File | null,
    commentAttachmentFile: File | null,
  ) => Promise<void> | void;
  onCancel?: () => void;
  onDelete?: () => void;
  submitLabel?: string;
}

function resolveInitialWorkMode(job?: Job | null): JobFormValues["workMode"] {
  const derived = deriveJobWorkMode(job?.location, job?.workMode);
  if (derived === "WFO" || derived === "WFH" || derived === "Hybrid") {
    return derived;
  }
  return "";
}

function resolveInitialAmIds(job?: Job | null): string[] {
  if (!job) {
    return [];
  }
  if (job.accountManagerIds?.length) {
    return job.accountManagerIds;
  }
  return job.accountManagerId ? [job.accountManagerId] : [];
}

function jobToFormValues(
  job?: Job | null,
  defaults?: { accountManagerId?: string; clientId?: string },
): JobFormValues {
  if (!job) {
    const amIds = defaults?.accountManagerId
      ? [defaults.accountManagerId]
      : [];
    return {
      title: "",
      clientId: defaults?.clientId ?? "",
      accountManagerId: amIds[0] ?? "",
      accountManagerIds: amIds,
      hiringManager: "",
      description: "",
      location: "",
      workMode: "",
      employmentType: "full_time",
      experience: "",
      salary: "",
      priority: "medium",
      skills: "",
      status: "open",
      notes: "",
    };
  }

  const amIds = resolveInitialAmIds(job);
  return {
    title: job.title,
    clientId: job.clientId ?? "",
    accountManagerId: amIds[0] ?? "",
    accountManagerIds: amIds,
    hiringManager: job.hiringManager ?? "",
    description: job.description ?? job.notes ?? "",
    location: job.location ?? "",
    workMode: resolveInitialWorkMode(job),
    employmentType: job.employmentType ?? "full_time",
    experience: job.experience ?? "",
    salary: job.salary ?? "",
    priority: job.priority ?? "medium",
    skills: job.skills.join(", "),
    status:
      job.status === "archived" ||
      job.status === "filled" ||
      job.status === "closed"
        ? "closed_by_us"
        : job.status === "on_hold"
          ? "hold_by_us"
          : job.status,
    notes: job.notes ?? "",
  };
}

export function JobForm({
  clients,
  accountManagers,
  initialJob,
  submitting = false,
  lockAccountManager = false,
  defaultClientId,
  lockClient = false,
  onSubmit,
  onCancel,
  onDelete,
  submitLabel = "Save Job",
}: JobFormProps) {
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdError, setJdError] = useState<string | null>(null);
  const [sampleResumeFile, setSampleResumeFile] = useState<File | null>(null);
  const [sampleResumeError, setSampleResumeError] = useState<string | null>(
    null,
  );
  const [commentAttachmentFile, setCommentAttachmentFile] =
    useState<File | null>(null);
  const [jdDocs, setJdDocs] = useState<JobDocument[]>(() =>
    (initialJob?.documents ?? []).filter(
      (doc) => doc.label === "Job Description",
    ),
  );
  const [sampleDocs, setSampleDocs] = useState<JobDocument[]>(() =>
    (initialJob?.documents ?? []).filter(
      (doc) => doc.label === "Sample Profiling",
    ),
  );
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [pendingRemove, startRemove] = useTransition();
  const defaultAccountManagerId = lockAccountManager
    ? (initialJob?.accountManagerId || accountManagers[0]?.id || "")
    : undefined;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema) as Resolver<JobFormValues>,
    defaultValues: jobToFormValues(initialJob, {
      accountManagerId: defaultAccountManagerId,
      clientId: defaultClientId,
    }),
  });

  const existingJdCount = jdDocs.length;
  const existingSampleResumeCount = sampleDocs.length;
  const selectedAmIds = watch("accountManagerIds") ?? [];

  function toggleAccountManager(id: string, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...selectedAmIds, id]))
      : selectedAmIds.filter((row) => row !== id);
    setValue("accountManagerIds", next, { shouldDirty: true });
    setValue("accountManagerId", next[0] ?? "", { shouldDirty: true });
  }

  function removeAttachment(
    field: "Job Description" | "Sample Profiling",
    doc: JobDocument,
  ) {
    if (!initialJob?.id) {
      return;
    }
    const key = `${field}:${doc.id ?? doc.url}`;
    setRemovingKey(key);
    startRemove(async () => {
      const result = await removeJobAttachmentAction({
        jobId: initialJob.id,
        field,
        attachmentId: doc.id,
        url: doc.url,
      });
      setRemovingKey(null);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      const nextDocs = result.data.documents ?? [];
      setJdDocs(
        nextDocs.filter((row) => row.label === "Job Description"),
      );
      setSampleDocs(
        nextDocs.filter((row) => row.label === "Sample Profiling"),
      );
      toast.success("Attachment removed");
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        setJdError(null);
        setSampleResumeError(null);
        await onSubmit(values, jdFile, sampleResumeFile, commentAttachmentFile);
      })}
    >
      {lockAccountManager ? (
        <input type="hidden" {...register("accountManagerId")} />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Job Title</Label>
          <Input id="title" {...register("title")} disabled={submitting} />
          {errors.title ? (
            <p className="text-xs text-[#EF4444]">{errors.title.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientId">Client</Label>
          <Select
            id="clientId"
            {...register("clientId")}
            disabled={submitting || lockClient}
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.label}
              </option>
            ))}
          </Select>
          {errors.clientId ? (
            <p className="text-xs text-[#EF4444]">{errors.clientId.message}</p>
          ) : null}
        </div>

        {lockAccountManager ? null : (
          <div className="space-y-2">
            <Label>Assigned Account Managers</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-[#E2E8F0] p-3">
              {accountManagers.length === 0 ? (
                <p className="text-xs text-[#64748B]">No account managers</p>
              ) : (
                accountManagers.map((am) => {
                  const checked = selectedAmIds.includes(am.id);
                  return (
                    <label
                      key={am.id}
                      className="flex cursor-pointer items-center gap-2 text-sm text-[#0F172A]"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#CBD5E1]"
                        checked={checked}
                        disabled={submitting}
                        onChange={(event) =>
                          toggleAccountManager(am.id, event.target.checked)
                        }
                      />
                      <span>{am.code?.trim() || am.label}</span>
                    </label>
                  );
                })
              )}
            </div>
            <input type="hidden" {...register("accountManagerId")} />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="hiringManager">Hiring Manager</Label>
          <Input
            id="hiringManager"
            {...register("hiringManager")}
            disabled={submitting}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="jd">Job Description (attachment)</Label>
          {existingJdCount > 0 ? (
            <p className="text-sm font-semibold text-[#0F766E]">
              {existingJdCount} file{existingJdCount === 1 ? "" : "s"} already
              attached
            </p>
          ) : null}
          <JobAttachmentList
            docs={jdDocs}
            field="Job Description"
            disabled={submitting || pendingRemove}
            removingKey={removingKey}
            onRemove={(doc) => removeAttachment("Job Description", doc)}
          />
          <Input
            id="jd"
            type="file"
            accept={DOCUMENT_ACCEPT}
            disabled={submitting}
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setJdFile(next);
              setJdError(null);
            }}
          />
          <p className="text-xs text-[#64748B]">
            {existingJdCount > 0
              ? "Upload another file to add to Job Description (PDF, Word, PNG, or JPG)."
              : "PDF, Word, PNG, or JPG."}
          </p>
          {jdError ? <p className="text-xs text-[#EF4444]">{jdError}</p> : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="sampleResume">Sample Resume</Label>
          {existingSampleResumeCount > 0 ? (
            <p className="text-sm font-semibold text-[#0F766E]">
              {existingSampleResumeCount} sample file
              {existingSampleResumeCount === 1 ? "" : "s"} already attached
            </p>
          ) : null}
          <JobAttachmentList
            docs={sampleDocs}
            field="Sample Profiling"
            disabled={submitting || pendingRemove}
            removingKey={removingKey}
            onRemove={(doc) => removeAttachment("Sample Profiling", doc)}
          />
          <Input
            id="sampleResume"
            type="file"
            accept={DOCUMENT_ACCEPT}
            disabled={submitting}
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setSampleResumeFile(next);
              setSampleResumeError(null);
            }}
          />
          <p className="text-xs text-[#64748B]">
            {existingSampleResumeCount > 0
              ? "Upload another file to add to Sample Profiling (PDF, Word, PNG, or JPG)."
              : "PDF, Word, PNG, or JPG — saved to Sample Profiling on the job."}
          </p>
          {sampleResumeError ? (
            <p className="text-xs text-[#EF4444]">{sampleResumeError}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Comments</Label>
          <Textarea
            id="description"
            rows={4}
            {...register("description")}
            disabled={submitting}
          />
          {errors.description ? (
            <p className="text-xs text-[#EF4444]">{errors.description.message}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="commentAttachment">
            Client screenshots / updates (optional)
          </Label>
          <Input
            id="commentAttachment"
            type="file"
            accept={DOCUMENT_ACCEPT}
            disabled={submitting}
            onChange={(event) => {
              setCommentAttachmentFile(event.target.files?.[0] ?? null);
            }}
          />
          <p className="text-xs text-[#64748B]">
            Attach screenshots or images from the client about this role. Saved
            with the job documents (PDF, PNG, or JPG).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register("location")} disabled={submitting} />
          {errors.location ? (
            <p className="text-xs text-[#EF4444]">{errors.location.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="workMode">Work Mode</Label>
          <Select id="workMode" {...register("workMode")} disabled={submitting}>
            {JOB_WORK_MODE_OPTIONS.map((option) => (
              <option key={option.value || "blank"} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {errors.workMode ? (
            <p className="text-xs text-[#EF4444]">{errors.workMode.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="employmentType">Employment Type</Label>
          <Select
            id="employmentType"
            {...register("employmentType", {
              setValueAs: (value: string) =>
                value === "" ? undefined : value,
            })}
            disabled={submitting}
          >
            <option value="">Select type</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </Select>
          {errors.employmentType ? (
            <p className="text-xs text-[#EF4444]">
              {errors.employmentType.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="experience">Years of Experience</Label>
          <Input
            id="experience"
            placeholder="e.g. 3-5 years"
            {...register("experience")}
            disabled={submitting}
          />
          {errors.experience ? (
            <p className="text-xs text-[#EF4444]">{errors.experience.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="salary">Salary Range</Label>
          <Input id="salary" {...register("salary")} disabled={submitting} />
          {errors.salary ? (
            <p className="text-xs text-[#EF4444]">{errors.salary.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" {...register("priority")} disabled={submitting}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Super High</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...register("status")} disabled={submitting}>
            <option value="open">Active</option>
            <option value="cancelled">Inactive</option>
            <option value="hold_by_us">Hold by us</option>
            <option value="hold_by_client">Hold by Client</option>
            <option value="closed_by_us">Closed by us</option>
            <option value="closed_alternatively">Closed Alternatively</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        {onDelete ? (
          <Button
            type="button"
            variant="destructive"
            disabled={submitting}
            onClick={onDelete}
          >
            Delete Job
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

function JobAttachmentList({
  docs,
  field,
  disabled,
  removingKey,
  onRemove,
}: {
  docs: JobDocument[];
  field: "Job Description" | "Sample Profiling";
  disabled?: boolean;
  removingKey: string | null;
  onRemove: (doc: JobDocument) => void;
}) {
  if (docs.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2 rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] p-3">
      {docs.map((doc) => {
        const key = `${field}:${doc.id ?? doc.url}`;
        const busy = removingKey === key;
        return (
          <li
            key={key}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 shadow-xs"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#0F172A]">
                {doc.filename}
              </p>
              <p className="text-[11px] text-[#64748B]">{field}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilePreviewLink
                url={doc.url}
                filename={doc.filename}
                title={`${field}: ${doc.filename}`}
                asButton
                variant="outline"
                size="sm"
              >
                View
              </FilePreviewLink>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={disabled || busy}
                onClick={() => onRemove(doc)}
              >
                {busy ? "Removing…" : "Remove"}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
