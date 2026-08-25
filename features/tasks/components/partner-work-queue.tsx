"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
    if (clientFilter === "all") {
      return tasks;
    }
    return tasks.filter(
      (task) => (task.clientName?.trim() || "") === clientFilter,
    );
  }, [clientFilter, tasks]);

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
        {clientOptions.length > 0 ? (
          <div className="w-full max-w-xs space-y-1.5 sm:w-56">
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

      {filteredTasks.length === 0 ? (
        <EmptyState
          title="No jobs for this client"
          description="Try another client filter, or clear the filter to see all assigned jobs."
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
