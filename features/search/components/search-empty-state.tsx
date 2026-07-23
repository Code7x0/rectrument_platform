"use client";

import { EmptyState } from "@/components/shared/empty-state";

interface SearchEmptyStateProps {
  query: string;
}

export function SearchEmptyState({ query }: SearchEmptyStateProps) {
  if (!query.trim()) {
    return (
      <EmptyState
        title="Search the platform"
        description="Find clients, jobs, partners, candidates, payouts, and more."
      />
    );
  }

  return (
    <EmptyState
      title="No results"
      description={`Nothing matched “${query}”. Try another term or filter.`}
    />
  );
}
