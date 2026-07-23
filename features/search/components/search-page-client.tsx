"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { globalSearchAction } from "@/features/search/actions";
import { SearchEmptyState } from "@/features/search/components/search-empty-state";
import { SearchFilterChips } from "@/features/search/components/search-filter-chips";
import { SearchResultItem } from "@/features/search/components/search-result-item";
import { SearchSkeleton } from "@/features/search/components/search-skeleton";
import { useRecentSearches } from "@/features/search/hooks/use-recent-searches";
import type {
  GlobalSearchResponse,
  SearchFilterChip,
} from "@/features/search/types";

interface SearchPageClientProps {
  initialQuery: string;
  initialFilter: SearchFilterChip;
  initial: GlobalSearchResponse | null;
}

export function SearchPageClient({
  initialQuery,
  initialFilter,
  initial,
}: SearchPageClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<SearchFilterChip>(initialFilter);
  const [response, setResponse] = useState(initial);
  const [pending, startTransition] = useTransition();
  const { addRecent } = useRecentSearches();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }
      if (filter !== "all") {
        params.set("type", filter);
      }
      const next = params.toString() ? `/search?${params}` : "/search";
      router.replace(next);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, filter, router]);

  useEffect(() => {
    if (!query.trim()) {
      setResponse(null);
      return;
    }
    startTransition(async () => {
      const result = await globalSearchAction({
        query,
        filter,
        mode: "page",
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setResponse(result.data);
      addRecent(query);
    });
  }, [query, filter, addRecent]);

  return (
    <ContentContainer>
      <Breadcrumb items={[{ label: "Search" }]} />
      <PageHeader
        title="Search"
        description="Find anything you’re allowed to access across the platform."
      />

      <div className="mb-4 space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-11 rounded-xl pl-9"
            autoFocus
          />
        </div>
        <SearchFilterChips value={filter} onChange={setFilter} />
      </div>

      {pending ? <SearchSkeleton rows={8} /> : null}

      {!pending && (!response || response.total === 0) ? (
        <SearchEmptyState query={query} />
      ) : null}

      {!pending && response && response.total > 0 ? (
        <div className="space-y-6">
          <p className="text-xs text-[#94A3B8]">
            {response.total} result{response.total === 1 ? "" : "s"} ·{" "}
            {response.tookMs}ms
          </p>
          {response.groups.map((group) => (
            <section
              key={group.id}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-3 sm:p-4"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-[#0F172A]">
                  {group.label}
                </h2>
                <span className="text-xs text-[#94A3B8]">{group.total}</span>
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SearchResultItem
                    key={item.id}
                    item={item}
                    query={query}
                    onSelect={() => addRecent(query)}
                  />
                ))}
              </div>
              {group.hasMore ? (
                <div className="mt-3 px-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilter(
                        group.id === "clients"
                          ? "clients"
                          : group.id === "jobs"
                            ? "jobs"
                            : group.id === "partners"
                              ? "partners"
                              : group.id === "candidates" ||
                                  group.id === "submissions"
                                ? "candidates"
                                : group.id === "documents"
                                  ? "documents"
                                  : group.id === "payouts"
                                    ? "payouts"
                                    : group.id === "activities"
                                      ? "activities"
                                      : group.id === "notifications"
                                        ? "notifications"
                                        : group.id === "settings"
                                          ? "settings"
                                          : "all",
                      );
                    }}
                  >
                    Narrow to {group.label}
                  </Button>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      ) : null}
    </ContentContainer>
  );
}
