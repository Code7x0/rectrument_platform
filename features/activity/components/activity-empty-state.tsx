"use client";

import { EmptyState } from "@/components/shared/empty-state";

interface ActivityEmptyStateProps {
  title?: string;
  description?: string;
}

export function ActivityEmptyState({
  title = "No activity yet",
  description = "When work happens on this record, it will appear here.",
}: ActivityEmptyStateProps) {
  return <EmptyState title={title} description={description} />;
}
