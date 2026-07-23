"use client";

import Link from "next/link";

import { ActivityIcon } from "@/features/activity/components/activity-icon";
import type { TimelineItem } from "@/features/activity/types";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ActivityCardProps {
  item: TimelineItem;
  className?: string;
}

export function ActivityCard({ item, className }: ActivityCardProps) {
  const body = (
    <>
      <ActivityIcon entityType={item.entityType} action={item.action} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-[#0F172A]">{item.title}</p>
          <Badge variant="outline">{item.entityLabel}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-[#475569]">
          {item.actorName ? (
            <>
              <span className="font-medium text-[#0F172A]">{item.actorName}</span>
              {" · "}
            </>
          ) : null}
          {item.summary ?? "No additional details"}
        </p>
        {item.createdAt ? (
          <time
            className="mt-1 block text-[11px] text-[#94A3B8]"
            dateTime={item.createdAt}
          >
            {formatDateTime(item.createdAt)}
          </time>
        ) : null}
      </div>
    </>
  );

  if (item.href) {
    return (
      <li>
        <Link
          href={item.href}
          className={cn(
            "flex gap-3 rounded-2xl border border-transparent px-3 py-3 transition hover:border-[#E2E8F0] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30",
            className,
          )}
        >
          {body}
        </Link>
      </li>
    );
  }

  return (
    <li className={cn("flex gap-3 px-3 py-3", className)}>
      {body}
    </li>
  );
}
