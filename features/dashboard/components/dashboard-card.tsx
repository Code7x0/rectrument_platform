import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DashboardCardProps {
  children: ReactNode;
  className?: string;
}

export function DashboardCard({ children, className }: DashboardCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface DashboardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

const COLUMN_CLASS = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  6: "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
} as const;

export function DashboardGrid({
  children,
  columns = 4,
  className,
}: DashboardGridProps) {
  return (
    <div className={cn("grid gap-3", COLUMN_CLASS[columns], className)}>
      {children}
    </div>
  );
}
