"use client";

import { useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PartnerWorkQueue } from "@/features/tasks/components/partner-work-queue";
import type { PartnerWorkTask } from "@/features/tasks/types";

interface PartnerJobsPageClientProps {
  tasks: PartnerWorkTask[];
}

export function PartnerJobsPageClient({ tasks }: PartnerJobsPageClientProps) {
  const [visibleCount, setVisibleCount] = useState(tasks.length);

  const title =
    visibleCount === tasks.length
      ? `My Jobs (${tasks.length})`
      : `My Jobs (${visibleCount} of ${tasks.length})`;

  return (
    <>
      <PageHeader
        title={title}
        description="Active and On Hold jobs allocated to you. Open a job for details and comments. Use Submit Profile to pick a JD and submit in one step."
      />
      <PartnerWorkQueue tasks={tasks} onVisibleCountChange={setVisibleCount} />
    </>
  );
}
