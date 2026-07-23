"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AllocationStatusBadge } from "@/features/allocations/components/allocation-status-badge";
import { JOB_PRIORITY_LABELS } from "@/features/jobs/types";
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
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#94A3B8]">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-[#0F172A]">{value ?? "—"}</p>
    </div>
  );
}

export function WorkTaskCard({ task, onOpenJob }: WorkTaskCardProps) {
  return (
    <article className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:border-[#CBD5E1]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-lg font-semibold text-[#0F172A]">
            {task.jobTitle}
          </h3>
          <p className="text-sm text-[#64748B]">
            {task.clientName ?? "Client TBD"}
            {task.jobCode ? ` · ${task.jobCode}` : null}
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

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Location" value={task.location} />
        <Meta label="Experience" value={task.experience} />
        <Meta label="Expected Profiles" value={task.expectedProfiles} />
        <Meta label="Submitted Profiles" value={task.submittedProfiles} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1F5F9] pt-4">
        <p className="text-sm text-[#0F172A]">
          <span className="font-medium">{task.remainingProfiles}</span>
          <span className="text-[#64748B]"> remaining profiles</span>
        </p>
        <Button type="button" onClick={() => onOpenJob(task)}>
          Open Job
        </Button>
      </div>
    </article>
  );
}
