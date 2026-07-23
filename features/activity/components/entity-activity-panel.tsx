"use client";

import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import type {
  TimelineEntityRef,
  TimelineListResult,
} from "@/features/activity/types";

interface EntityActivityPanelProps {
  entityRef: TimelineEntityRef;
  initial: TimelineListResult;
  showFilters?: boolean;
}

export function EntityActivityPanel({
  entityRef,
  initial,
  showFilters = false,
}: EntityActivityPanelProps) {
  return (
    <ActivityTimeline
      initial={initial}
      mode="entity"
      entityRef={entityRef}
      showFilters={showFilters}
      compact
    />
  );
}
