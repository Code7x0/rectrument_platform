import Link from "next/link";

import { DashboardCard } from "@/features/dashboard/components/dashboard-card";
import { DashboardEmptyState } from "@/features/dashboard/components/dashboard-empty-state";
import type { DashboardListItem } from "@/features/dashboard/types";
import { cn } from "@/lib/utils";

interface DashboardListProps {
  items: DashboardListItem[];
  emptyTitle: string;
  emptyDescription?: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
  className?: string;
}

export function DashboardList({
  items,
  emptyTitle,
  emptyDescription,
  emptyActionHref,
  emptyActionLabel,
  className,
}: DashboardListProps) {
  if (items.length === 0) {
    return (
      <DashboardEmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionHref={emptyActionHref}
        actionLabel={emptyActionLabel}
        className={className}
      />
    );
  }

  return (
    <DashboardCard className={cn("p-0", className)}>
      <ul className="divide-y divide-[#F1F5F9]" role="list">
        {items.map((item) => {
          const content = (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0F172A]">
                  {item.title}
                </p>
                {item.subtitle ? (
                  <p className="truncate text-xs text-[#64748B]">
                    {item.subtitle}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                {item.badge ? (
                  <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-medium text-[#475569]">
                    {item.badge}
                  </span>
                ) : null}
                {item.meta ? (
                  <p className="mt-0.5 text-[11px] text-[#94A3B8]">{item.meta}</p>
                ) : null}
              </div>
            </>
          );

          if (item.href) {
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-start gap-3 px-4 py-3 transition hover:bg-[#F8FAFC] focus-visible:bg-[#F8FAFC] focus-visible:outline-none"
                >
                  {content}
                </Link>
              </li>
            );
          }

          return (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              {content}
            </li>
          );
        })}
      </ul>
    </DashboardCard>
  );
}
