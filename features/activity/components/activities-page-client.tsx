"use client";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import type { TimelineListResult } from "@/features/activity/types";

interface ActivitiesPageClientProps {
  initial: TimelineListResult;
  breadcrumbs: Array<{ label: string; href?: string }>;
  description: string;
}

export function ActivitiesPageClient({
  initial,
  breadcrumbs,
  description,
}: ActivitiesPageClientProps) {
  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader title="Activity" description={description} />
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-6">
        <ActivityTimeline initial={initial} mode="global" showFilters />
      </div>
    </ContentContainer>
  );
}
