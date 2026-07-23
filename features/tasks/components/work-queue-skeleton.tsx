import { Skeleton } from "@/components/ui/skeleton";

interface WorkQueueSkeletonProps {
  count?: number;
}

export function WorkQueueSkeleton({ count = 3 }: WorkQueueSkeletonProps) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading work queue">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
        >
          <div className="flex justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="mt-5 flex justify-between border-t border-[#F1F5F9] pt-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
