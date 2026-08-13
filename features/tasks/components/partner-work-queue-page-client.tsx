"use client";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { PartnerWorkQueue } from "@/features/tasks/components/partner-work-queue";
import type { PartnerWorkTask } from "@/features/tasks/types";

interface PartnerWorkQueuePageClientProps {
  tasks: PartnerWorkTask[];
}

export function PartnerWorkQueuePageClient({
  tasks,
}: PartnerWorkQueuePageClientProps) {
  return (
    <ContentContainer>
      <Breadcrumb items={[{ label: "Partner" }, { label: "My Work" }]} />
      <PageHeader
        title="Assigned Jobs"
        description="Active jobs assigned to you, sorted by priority."
      />
      <PartnerWorkQueue tasks={tasks} />
    </ContentContainer>
  );
}
