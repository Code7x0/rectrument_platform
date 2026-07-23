"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  jobFormSchema,
  type JobFormValues,
} from "@/features/jobs/schemas/job.schema";
import type { Job } from "@/features/jobs/types";
import type { LookupOption } from "@/services/lookups";

interface JobFormProps {
  clients: LookupOption[];
  accountManagers: LookupOption[];
  initialJob?: Job | null;
  submitting?: boolean;
  onSubmit: (values: JobFormValues) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

function jobToFormValues(job?: Job | null): JobFormValues {
  if (!job) {
    return {
      title: "",
      clientId: "",
      accountManagerId: "",
      hiringManager: "",
      description: "",
      location: "",
      employmentType: undefined,
      experience: "",
      salary: "",
      priority: "medium",
      openPositions: 1,
      skills: "",
      status: "open",
      notes: "",
      department: "",
    };
  }

  return {
    title: job.title,
    clientId: job.clientId ?? "",
    accountManagerId: job.accountManagerId ?? "",
    hiringManager: job.hiringManager ?? "",
    description: job.description ?? "",
    location: job.location ?? "",
    employmentType: job.employmentType ?? undefined,
    experience: job.experience ?? "",
    salary: job.salary ?? "",
    priority: job.priority ?? "medium",
    openPositions: job.openPositions || 1,
    skills: job.skills.join(", "),
    status: job.status === "archived" ? "open" : job.status,
    notes: job.notes ?? "",
    department: job.department ?? "",
  };
}

export function JobForm({
  clients,
  accountManagers,
  initialJob,
  submitting = false,
  onSubmit,
  onCancel,
  submitLabel = "Save Job",
}: JobFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema) as Resolver<JobFormValues>,
    defaultValues: jobToFormValues(initialJob),
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
          <Select id="clientId" {...register("clientId")} disabled={submitting}>
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

        <div className="space-y-2">
          <Label htmlFor="accountManagerId">Assigned Account Manager</Label>
          <Select
            id="accountManagerId"
            {...register("accountManagerId")}
            disabled={submitting}
          >
            <option value="">Select account manager</option>
            {accountManagers.map((am) => (
              <option key={am.id} value={am.id}>
                {am.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-[#64748B]">
            Assigns this job&apos;s client to the Account Manager (Clients →
            Account Owner).
          </p>
          {errors.accountManagerId ? (
            <p className="text-xs text-[#EF4444]">
              {errors.accountManagerId.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="hiringManager">Hiring Manager</Label>
          <Input
            id="hiringManager"
            {...register("hiringManager")}
            disabled={submitting}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Job Description</Label>
          <Textarea
            id="description"
            {...register("description")}
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register("location")} disabled={submitting} />
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="experience">Experience</Label>
          <Input
            id="experience"
            placeholder="e.g. 3-5 years"
            {...register("experience")}
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="salary">Salary</Label>
          <Input id="salary" {...register("salary")} disabled={submitting} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" {...register("priority")} disabled={submitting}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="openPositions">Open Positions</Label>
          <Input
            id="openPositions"
            type="number"
            min={1}
            {...register("openPositions")}
            disabled={submitting}
          />
          {errors.openPositions ? (
            <p className="text-xs text-[#EF4444]">
              {errors.openPositions.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...register("status")} disabled={submitting}>
            <option value="open">Open</option>
            <option value="on_hold">On Hold</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
            <option value="filled">Filled</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            {...register("department")}
            disabled={submitting}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="skills">Skills</Label>
          <Input
            id="skills"
            placeholder="Comma-separated skills"
            {...register("skills")}
            disabled={submitting}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...register("notes")} disabled={submitting} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
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
    </form>
  );
}
