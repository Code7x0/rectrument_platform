import type {
  TimelineDateBucket,
  TimelineGroup,
  TimelineItem,
} from "@/features/activity/types";
import { TIMELINE_DATE_BUCKET_LABELS } from "@/features/activity/types";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getTimelineBucket(
  createdAt: string | null,
  now = new Date(),
): TimelineDateBucket {
  if (!createdAt) {
    return "older";
  }
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return "older";
  }

  const today = startOfDay(now);
  const target = startOfDay(created);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 0) {
    return "today";
  }
  if (diffDays === 1) {
    return "yesterday";
  }

  const day = today.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  if (diffDays <= daysSinceMonday) {
    return "earlier_this_week";
  }

  if (
    created.getFullYear() === now.getFullYear() &&
    created.getMonth() === now.getMonth()
  ) {
    return "earlier_this_month";
  }

  return "older";
}

const BUCKET_ORDER: TimelineDateBucket[] = [
  "today",
  "yesterday",
  "earlier_this_week",
  "earlier_this_month",
  "older",
];

export function groupTimelineItems(items: TimelineItem[]): TimelineGroup[] {
  const map = new Map<TimelineDateBucket, TimelineItem[]>();
  for (const bucket of BUCKET_ORDER) {
    map.set(bucket, []);
  }
  for (const item of items) {
    const bucket = getTimelineBucket(item.createdAt);
    map.get(bucket)?.push(item);
  }

  return BUCKET_ORDER.filter((bucket) => (map.get(bucket)?.length ?? 0) > 0).map(
    (bucket) => ({
      bucket,
      label: TIMELINE_DATE_BUCKET_LABELS[bucket],
      items: map.get(bucket) ?? [],
    }),
  );
}
