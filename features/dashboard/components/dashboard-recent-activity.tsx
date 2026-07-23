import Link from "next/link";

import { DashboardCard } from "@/features/dashboard/components/dashboard-card";
import { DashboardEmptyState } from "@/features/dashboard/components/dashboard-empty-state";
import type { DashboardActivityItem } from "@/features/dashboard/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface DashboardRecentActivityProps {
  items: DashboardActivityItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DashboardRecentActivity({
  items,
  emptyTitle = "No recent activity",
  emptyDescription = "Operational updates will appear here as work happens.",
  className,
}: DashboardRecentActivityProps) {
  if (items.length === 0) {
    return (
      <DashboardEmptyState
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }

  return (
    <DashboardCard className={cn("p-0", className)}>
      <ol className="divide-y divide-[#F1F5F9]" aria-label="Recent activity">
        {items.map((item) => {
          const body = (
            <>
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#CBD5E1]" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[#0F172A]">
                  {item.title}
                </span>
                {item.description ? (
                  <span className="mt-0.5 block text-xs text-[#64748B]">
                    {item.description}
                  </span>
                ) : null}
                {item.timestamp ? (
                  <time
                    className="mt-1 block text-[11px] text-[#94A3B8]"
                    dateTime={item.timestamp}
                  >
                    {formatDateTime(item.timestamp)}
                  </time>
                ) : null}
              </span>
            </>
          );

          if (item.href) {
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex gap-3 px-4 py-3 transition hover:bg-[#F8FAFC] focus-visible:bg-[#F8FAFC] focus-visible:outline-none"
                >
                  {body}
                </Link>
              </li>
            );
          }

          return (
            <li key={item.id} className="flex gap-3 px-4 py-3">
              {body}
            </li>
          );
        })}
      </ol>
    </DashboardCard>
  );
}
