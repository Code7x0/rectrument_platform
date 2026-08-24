"use client";

import Link from "next/link";
import { Briefcase } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { WorkTaskCard } from "@/features/tasks/components/work-task-card";
import type { PartnerWorkTask } from "@/features/tasks/types";

interface PartnerWorkQueueProps {
  tasks: PartnerWorkTask[];
}

/**
 * Partner daily work screen — card queue, not a dashboard.
 */
export function PartnerWorkQueue({ tasks }: PartnerWorkQueueProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No assigned work"
        description="Claim an open job from Available Jobs, or wait until an Account Manager allocates you."
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
      {tasks.map((task) => (
        <WorkTaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
