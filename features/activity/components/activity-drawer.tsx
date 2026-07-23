"use client";

import { useEffect, useState, useTransition } from "react";
import { History } from "lucide-react";
import { toast } from "sonner";

import { DetailDrawer } from "@/components/shared/detail-drawer";
import { Button } from "@/components/ui/button";
import { loadEntityTimelinePageAction } from "@/features/activity/actions";
import { ActivitySkeleton } from "@/features/activity/components/activity-skeleton";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import type {
  TimelineEntityRef,
  TimelineListResult,
} from "@/features/activity/types";

interface ActivityDrawerProps {
  entityRef: TimelineEntityRef;
  title?: string;
  triggerLabel?: string;
  initial?: TimelineListResult | null;
}

export function ActivityDrawer({
  entityRef,
  title = "Activity Timeline",
  triggerLabel = "Activity",
  initial = null,
}: ActivityDrawerProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TimelineListResult | null>(initial);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || data) {
      return;
    }
    startTransition(async () => {
      const result = await loadEntityTimelinePageAction(entityRef, {
        page: 1,
        pageSize: 40,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setData(result.data);
    });
  }, [open, data, entityRef]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <History className="h-4 w-4" />
        {triggerLabel}
      </Button>
      <DetailDrawer
        open={open}
        onOpenChange={setOpen}
        title={title}
        className="sm:max-w-xl"
      >
        {pending && !data ? <ActivitySkeleton rows={6} /> : null}
        {data ? (
          <ActivityTimeline
            initial={data}
            mode="entity"
            entityRef={entityRef}
            showFilters={false}
            compact
          />
        ) : null}
      </DetailDrawer>
    </>
  );
}
