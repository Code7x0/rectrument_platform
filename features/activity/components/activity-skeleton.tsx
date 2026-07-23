"use client";

import { cn } from "@/lib/utils";

interface ActivitySkeletonProps {
  rows?: number;
  className?: string;
}

export function ActivitySkeleton({
  rows = 5,
  className,
}: ActivitySkeletonProps) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-3 py-3"
        >
          <div className="h-9 w-9 rounded-xl bg-[#E2E8F0]" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-1/3 rounded bg-[#E2E8F0]" />
            <div className="h-3 w-2/3 rounded bg-[#F1F5F9]" />
            <div className="h-2 w-1/4 rounded bg-[#F1F5F9]" />
          </div>
        </div>
      ))}
    </div>
  );
}
