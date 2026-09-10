import type { JobListFilters } from "@/features/jobs/types";

/** Build jobs list URL with optional status / priority filters. */
export function jobsListHref(
  basePath: string,
  filters: Partial<Pick<JobListFilters, "status" | "priority">> = {},
): string {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.priority && filters.priority !== "all") {
    params.set("priority", filters.priority);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
