"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { loadEntityTimelinePageAction } from "@/features/activity/actions";
import { ActivitySkeleton } from "@/features/activity/components/activity-skeleton";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import type {
  TimelineEntityRef,
  TimelineListResult,
} from "@/features/activity/types";

interface EntityActivityInlineProps {
  entityRef: TimelineEntityRef;
  title?: string;
}

/**
 * Inline entity timeline for detail drawers (loads on mount).
 */
export function EntityActivityInline({
  entityRef,
  title = "Activity",
}: EntityActivityInlineProps) {
  const [data, setData] = useState<TimelineListResult | null>(null);
  const [pending, startTransition] = useTransition();
  const key = `${entityRef.kind}:${entityRef.id}`;

  useEffect(() => {
    setData(null);
    startTransition(async () => {
      const result = await loadEntityTimelinePageAction(entityRef, {
        page: 1,
        pageSize: 20,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setData(result.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when entity key changes
  }, [key]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
      {pending && !data ? <ActivitySkeleton rows={4} /> : null}
      {data ? (
        <ActivityTimeline
          initial={data}
          mode="entity"
          entityRef={entityRef}
          showFilters={false}
          compact
        />
      ) : null}
    </div>
  );
}
