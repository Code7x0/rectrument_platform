"use client";

import { cn } from "@/lib/utils";

interface SearchSkeletonProps {
  rows?: number;
  className?: string;
}

export function SearchSkeleton({ rows = 6, className }: SearchSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse gap-3 rounded-xl px-3 py-2.5"
        >
          <div className="h-8 w-8 rounded-lg bg-[#E2E8F0]" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-1/3 rounded bg-[#E2E8F0]" />
            <div className="h-3 w-1/2 rounded bg-[#F1F5F9]" />
          </div>
        </div>
      ))}
    </div>
  );
}
