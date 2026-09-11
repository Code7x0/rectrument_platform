"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { JobPriority } from "@/features/jobs/types";
import { JOB_PRIORITY_LABELS } from "@/features/jobs/types";

export type PartnerJobPriorityFilterValue = JobPriority | "all";

interface PartnerJobPriorityFilterProps {
  value: PartnerJobPriorityFilterValue;
  onChange: (value: PartnerJobPriorityFilterValue) => void;
  id?: string;
  className?: string;
}

export function PartnerJobPriorityFilter({
  value,
  onChange,
  id = "partner-priority-filter",
  className,
}: PartnerJobPriorityFilterProps) {
  return (
    <div className={className}>
      <Label htmlFor={id}>Priority</Label>
      <Select
        id={id}
        value={value}
        onChange={(event) =>
          onChange(event.target.value as PartnerJobPriorityFilterValue)
        }
      >
        <option value="all">All priorities</option>
        <option value="urgent">Super High</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </Select>
      {value !== "all" ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Showing only {JOB_PRIORITY_LABELS[value]} priority roles.
        </p>
      ) : null}
    </div>
  );
}
