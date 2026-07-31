"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AllocationStatusBadge } from "@/features/allocations/components/allocation-status-badge";
import { JOB_PRIORITY_LABELS } from "@/features/jobs/types";
import { deriveJobWorkMode } from "@/features/jobs/lib/work-mode";
import type { PartnerWorkTask } from "@/features/tasks/types";

interface WorkTaskCardProps {
  task: PartnerWorkTask;
  onOpenJob: (task: PartnerWorkTask) => void;
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">
        {label}
      </p>
      <div className="mt-0.5 text-sm text-[#0F172A]">{value ?? "—"}</div>
    </div>
  );
}

export function WorkTaskCard({ task, onOpenJob }: WorkTaskCardProps) {
  const salary = task.job.salary?.trim() || null;
  const workMode = deriveJobWorkMode(task.location);

  return (
    <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:border-[#CBD5E1]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-lg font-semibold text-[#0F172A]">
            {task.jobTitle}
          </h3>
          <p className="text-sm text-[#64748B]">
            Job ID: {task.jobCode?.trim() || "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {task.priority ? (
            <Badge
              variant={
                task.priority === "urgent" || task.priority === "high"
                  ? "warning"
                  : "secondary"
              }
            >
              {JOB_PRIORITY_LABELS[task.priority]}
            </Badge>
          ) : null}
          <AllocationStatusBadge status={task.allocationStatus} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Meta label="Job ID" value={task.jobCode} />
        <Meta label="Location" value={task.location} />
        <Meta label="Years of Experience" value={task.experience} />
        <Meta label="Salary Range" value={salary} />
        <Meta label="WFO / WFH" value={workMode} />
        <Meta
          label="Submitted Profiles"
          value={
            <Link
              href={`/partner/candidates?jobId=${encodeURIComponent(task.jobId)}`}
              className="font-semibold text-[#2563EB] underline-offset-2 hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {task.submittedProfiles}
            </Link>
          }
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1F5F9] pt-4">
        <p className="text-sm text-[#0F172A]">
          <span className="font-medium">{task.remainingProfiles}</span>
          <span className="text-[#64748B]"> remaining to submit</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenJob(task)}>
            Open Job
          </Button>
        </div>
      </div>
    </article>
  );
}
