"use client";

import { ActivityCard } from "@/features/activity/components/activity-card";
import { ActivityDateHeader } from "@/features/activity/components/activity-date-header";
import type { TimelineGroup } from "@/features/activity/types";

interface ActivityGroupProps {
  group: TimelineGroup;
}

export function ActivityGroup({ group }: ActivityGroupProps) {
  return (
    <section aria-labelledby={`activity-group-${group.bucket}`}>
      <ActivityDateHeader label={group.label} />
      <ol className="space-y-1" id={`activity-group-${group.bucket}`}>
        {group.items.map((item) => (
          <ActivityCard key={item.id} item={item} />
        ))}
      </ol>
    </section>
  );
}
