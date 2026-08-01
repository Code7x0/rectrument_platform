"use client";

import { cn } from "@/lib/utils";

export function SecondLevelReviewBadge({
  className,
  label = "2nd Review Requested",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-[#FCD34D] bg-[#FFFBEB] px-2 py-0.5 text-xs font-medium text-[#92400E]",
        className,
      )}
    >
      {label}
    </span>
  );
}
