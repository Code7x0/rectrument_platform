"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  loadEntityTimelinePageAction,
  loadGlobalTimelinePageAction,
} from "@/features/activity/actions";
import { ActivityEmptyState } from "@/features/activity/components/activity-empty-state";
import { ActivityFilter } from "@/features/activity/components/activity-filter";
import { ActivityGroup } from "@/features/activity/components/activity-group";
import { ActivitySkeleton } from "@/features/activity/components/activity-skeleton";
import { groupTimelineItems } from "@/features/activity/services/grouping";
import type {
  TimelineEntityRef,
  TimelineItem,
  TimelineListFilters,
  TimelineListResult,
} from "@/features/activity/types";

interface ActivityTimelineProps {
  initial: TimelineListResult;
  mode?: "global" | "entity";
  entityRef?: TimelineEntityRef;
  showFilters?: boolean;
  compact?: boolean;
}

export function ActivityTimeline({
  initial,
  mode = "global",
  entityRef,
  showFilters = true,
  compact = false,
}: ActivityTimelineProps) {
  const [filters, setFilters] = useState<TimelineListFilters>({
    page: initial.page,
    pageSize: initial.pageSize,
    entityType: "all",
    action: "all",
    actorRole: "all",
    search: "",
  });
  const [items, setItems] = useState<TimelineItem[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [pending, startTransition] = useTransition();

  const groups = useMemo(() => groupTimelineItems(items), [items]);

  function reload(nextFilters: TimelineListFilters, append = false) {
    startTransition(async () => {
      const result =
        mode === "entity" && entityRef
          ? await loadEntityTimelinePageAction(entityRef, nextFilters)
          : await loadGlobalTimelinePageAction(nextFilters);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setFilters(nextFilters);
      setPage(result.data.page);
      setHasMore(result.data.hasMore);
      setTotal(result.data.total);
      setItems((current) =>
        append
          ? [
              ...current,
              ...result.data.items.filter(
                (row) => !current.some((existing) => existing.id === row.id),
              ),
            ]
          : result.data.items,
      );
    });
  }

  return (
    <div className="space-y-4">
      {showFilters ? (
        <ActivityFilter
          value={filters}
          compact={compact}
          onChange={(next) => {
            const withPage = { ...next, page: 1, pageSize: filters.pageSize };
            reload(withPage, false);
          }}
        />
      ) : null}

      <p className="text-xs text-[#94A3B8]">
        {total} event{total === 1 ? "" : "s"}
        {pending ? " · Updating…" : ""}
      </p>

      {pending && items.length === 0 ? <ActivitySkeleton /> : null}

      {!pending && items.length === 0 ? (
        <ActivityEmptyState
          title="No matching activity"
          description="Try clearing filters or check back after the next workflow event."
        />
      ) : null}

      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <ActivityGroup key={group.bucket} group={group} />
          ))}
        </div>
      ) : null}

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              reload({ ...filters, page: page + 1 }, true);
            }}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
