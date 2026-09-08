"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  PartnerJobPriorityFilter,
  type PartnerJobPriorityFilterValue,
} from "@/features/jobs/components/partner-job-priority-filter";
import { compareJobsByPriorityThenOpenDate } from "@/features/jobs/lib/job-priority-sort";
import { WorkTaskCard } from "@/features/tasks/components/work-task-card";
import type { PartnerWorkTask } from "@/features/tasks/types";

interface PartnerWorkQueueProps {
  tasks: PartnerWorkTask[];
}

/**
 * Partner daily work screen — card queue, not a dashboard.
 * Includes Active and On Hold allocations; filter by client when needed.
 */
export function PartnerWorkQueue({ tasks }: PartnerWorkQueueProps) {
  const [clientFilter, setClientFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] =
    useState<PartnerJobPriorityFilterValue>("all");

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of tasks) {
      const label = task.clientName?.trim();
      if (!label) {
        continue;
      }
      map.set(label, label);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let rows = tasks;
    if (clientFilter !== "all") {
      rows = rows.filter(
        (task) => (task.clientName?.trim() || "") === clientFilter,
      );
    }
    if (priorityFilter !== "all") {
      rows = rows.filter((task) => task.priority === priorityFilter);
    }
    return [...rows].sort((a, b) =>
      compareJobsByPriorityThenOpenDate(a.job, b.job),
    );
  }, [clientFilter, priorityFilter, tasks]);

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No assigned work"
        description="Claim an open job from Available Jobs, or wait until an Account Manager allocates you. Active and On Hold jobs stay here while allocated to you."
        icon={<Briefcase className="h-5 w-5" />}
        action={
          <Button asChild>
            <Link href="/partner/available-jobs">Browse available jobs</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-[#64748B]">
          Showing {filteredTasks.length} of {tasks.length} assigned job
          {tasks.length === 1 ? "" : "s"} (includes Active and On Hold).
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
          <PartnerJobPriorityFilter
            value={priorityFilter}
            onChange={setPriorityFilter}
            id="partner-assigned-priority-filter"
            className="w-full space-y-1.5 sm:w-56"
          />
          {clientOptions.length > 0 ? (
            <div className="w-full space-y-1.5 sm:w-56">
              <Label htmlFor="partner-client-filter">Client</Label>
              <Select
                id="partner-client-filter"
                value={clientFilter}
                onChange={(event) => setClientFilter(event.target.value)}
              >
                <option value="all">All clients</option>
                {clientOptions.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState
          title={
            priorityFilter !== "all" || clientFilter !== "all"
              ? "No jobs match your filters"
              : "No jobs for this client"
          }
          description="Try another priority or client filter, or clear filters to see all assigned jobs."
          icon={<Briefcase className="h-5 w-5" />}
        />
      ) : (
        filteredTasks.map((task) => (
          <WorkTaskCard key={task.id} task={task} />
        ))
      )}
    </div>
  );
}
