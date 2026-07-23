import { Skeleton } from "@/components/ui/skeleton";
import { DashboardGrid } from "@/features/dashboard/components/dashboard-card";
import { cn } from "@/lib/utils";

interface DashboardSkeletonProps {
  className?: string;
  metricCount?: number;
}

export function DashboardSkeleton({
  className,
  metricCount = 6,
}: DashboardSkeletonProps) {
  return (
    <div className={cn("space-y-8", className)} aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40 rounded-lg" />
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
      </div>

      <DashboardGrid columns={metricCount > 4 ? 6 : 4}>
        {Array.from({ length: metricCount }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </DashboardGrid>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
