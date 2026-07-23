import Link from "next/link";

import { cn } from "@/lib/utils";

interface DashboardEmptyStateProps {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export function DashboardEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: DashboardEmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] px-4 py-8 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-[#0F172A]">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-xs text-[#64748B]">
          {description}
        </p>
      ) : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-3 inline-flex text-xs font-medium text-[#2563EB] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
