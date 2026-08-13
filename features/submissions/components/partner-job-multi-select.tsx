"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PartnerWorkTask } from "@/features/tasks/types";
import { cn } from "@/lib/utils";

export type PartnerJobOption = Pick<
  PartnerWorkTask,
  | "id"
  | "allocationId"
  | "jobId"
  | "jobTitle"
  | "jobCode"
  | "clientName"
  | "location"
  | "remainingProfiles"
  | "submittedProfiles"
>;

export function partnerJobOptionLabel(task: PartnerJobOption): string {
  const code = task.jobCode?.trim();
  const client = task.clientName?.trim();
  return [code ? `${code} — ${task.jobTitle}` : task.jobTitle, client]
    .filter(Boolean)
    .join(" · ");
}

interface PartnerJobMultiSelectProps {
  jobs: PartnerJobOption[];
  selectedTaskIds: string[];
  onChange: (taskIds: string[]) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
}

export function PartnerJobMultiSelect({
  jobs,
  selectedTaskIds,
  onChange,
  disabled = false,
  label = "Jobs",
  hint = "Select one or more of your allocated jobs.",
}: PartnerJobMultiSelectProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filtered = useMemo(() => {
    if (!deferredQuery) {
      return jobs;
    }
    return jobs.filter((task) => {
      const blob = [
        task.jobTitle,
        task.jobCode,
        task.clientName,
        task.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(deferredQuery);
    });
  }, [jobs, deferredQuery]);

  const selectedSet = useMemo(
    () => new Set(selectedTaskIds),
    [selectedTaskIds],
  );

  function toggle(taskId: string, checked: boolean) {
    if (checked) {
      onChange(Array.from(new Set([...selectedTaskIds, taskId])));
      return;
    }
    onChange(selectedTaskIds.filter((id) => id !== taskId));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <Label>{label}</Label>
        <p className="text-xs text-[#64748B]">
          {selectedTaskIds.length === 0
            ? "None selected"
            : `${selectedTaskIds.length} selected`}
        </p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search job title, code, or client…"
          className="pl-9"
          disabled={disabled}
          aria-label="Search jobs"
        />
      </div>
      <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-[#E2E8F0] p-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-xs text-[#64748B]">
            {jobs.length === 0
              ? "No allocated jobs available."
              : "No jobs match this search."}
          </p>
        ) : (
          filtered.map((task) => {
            const checked = selectedSet.has(task.id);
            return (
              <label
                key={task.id}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm text-[#0F172A] hover:bg-[#F8FAFC]",
                  checked && "bg-[#EFF6FF]",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1]"
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) =>
                    toggle(task.id, event.target.checked)
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-snug">
                    {partnerJobOptionLabel(task)}
                  </span>
                  {typeof task.submittedProfiles === "number" ? (
                    <span className="mt-0.5 block text-xs text-[#64748B]">
                      {task.submittedProfiles} submitted
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })
        )}
      </div>
      <p className="text-xs text-[#64748B]">{hint}</p>
    </div>
  );
}
