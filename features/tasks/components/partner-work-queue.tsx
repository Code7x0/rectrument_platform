"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { JobDrawer } from "@/features/jobs/components/job-drawer";
import { SubmitCandidateDialog } from "@/features/submissions/components";
import { WorkTaskCard } from "@/features/tasks/components/work-task-card";
import type { PartnerWorkTask } from "@/features/tasks/types";

interface PartnerWorkQueueProps {
  tasks: PartnerWorkTask[];
}

/**
 * Partner daily work screen — card queue, not a dashboard.
 * Submit Candidate opens the Submission Engine dialog.
 */
export function PartnerWorkQueue({ tasks }: PartnerWorkQueueProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<PartnerWorkTask | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No assigned work."
        description="When an Account Manager allocates you to a job, it will appear here."
        icon={<Briefcase className="h-5 w-5" />}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tasks.map((task) => (
          <WorkTaskCard
            key={task.id}
            task={task}
            onOpenJob={setSelected}
          />
        ))}
      </div>

      <JobDrawer
        job={selected?.job ?? null}
        open={Boolean(selected) && !submitOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
        footer={
          <Button
            type="button"
            className="w-full"
            onClick={() => setSubmitOpen(true)}
          >
            Submit Candidate
          </Button>
        }
      />

      {selected ? (
        <SubmitCandidateDialog
          open={submitOpen}
          jobId={selected.jobId}
          allocationId={selected.allocationId}
          jobTitle={selected.jobTitle}
          onOpenChange={(open) => {
            setSubmitOpen(open);
            if (!open) {
              setSelected(null);
            }
          }}
          onCompleted={() => {
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
