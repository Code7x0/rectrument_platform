"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { globalSearchAction } from "@/features/search/actions";
import { SearchEmptyState } from "@/features/search/components/search-empty-state";
import { SearchFilterChips } from "@/features/search/components/search-filter-chips";
import { SearchResultItem } from "@/features/search/components/search-result-item";
import { SearchSkeleton } from "@/features/search/components/search-skeleton";
import { useRecentSearches } from "@/features/search/hooks/use-recent-searches";
import type {
  GlobalSearchResponse,
  SearchFilterChip,
  SearchResult,
} from "@/features/search/types";
import { cn } from "@/lib/utils";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilterChip>("all");
  const [response, setResponse] = useState<GlobalSearchResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const { recent, addRecent, clearOne, clearAll } = useRecentSearches();

  const flatResults = useMemo(
    () => response?.groups.flatMap((group) => group.items) ?? [],
    [response],
  );

  const runSearch = useCallback(
    (nextQuery: string, nextFilter: SearchFilterChip) => {
      if (!nextQuery.trim()) {
        setResponse(null);
        return;
      }
      startTransition(async () => {
        const result = await globalSearchAction({
          query: nextQuery,
          filter: nextFilter,
          mode: "modal",
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        setResponse(result.data);
        setActiveIndex(0);
      });
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handle = window.setTimeout(() => {
      runSearch(query, filter);
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query, filter, open, runSearch]);

  function selectResult(item: SearchResult) {
    addRecent(query);
    onOpenChange(false);
    router.push(item.url);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        flatResults.length === 0
          ? 0
          : Math.min(current + 1, flatResults.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      const item = flatResults[activeIndex];
      if (item) {
        event.preventDefault();
        selectResult(item);
      } else if (query.trim()) {
        event.preventDefault();
        addRecent(query);
        onOpenChange(false);
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "left-0 top-0 flex h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:left-1/2 sm:top-[12vh] sm:h-auto sm:max-h-[76vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:translate-y-0 sm:rounded-2xl",
        )}
        onKeyDown={onKeyDown}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Global search</DialogTitle>
          <DialogDescription>
            Search entities you can access across the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[#94A3B8]" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients, jobs, partners…"
            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            aria-autocomplete="list"
            aria-controls="global-search-results"
            aria-activedescendant={
              flatResults[activeIndex]
                ? `search-option-${activeIndex}`
                : undefined
            }
          />
          <kbd className="hidden rounded border border-[#E2E8F0] px-1.5 py-0.5 text-[10px] text-[#94A3B8] sm:inline">
            ESC
          </kbd>
        </div>

        <div className="border-b border-[#F1F5F9] px-4 py-3">
          <SearchFilterChips value={filter} onChange={setFilter} />
        </div>

        <div
          id="global-search-results"
          role="listbox"
          aria-label="Search results"
          className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:max-h-[48vh]"
        >
          {!query.trim() && recent.length > 0 ? (
            <div className="space-y-2 px-2 py-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Recent
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={clearAll}
                >
                  Clear all
                </Button>
              </div>
              <ul className="space-y-1">
                {recent.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
                      onClick={() => setQuery(item)}
                    >
                      <Clock3 className="h-4 w-4 text-[#94A3B8]" />
                      {item}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Remove ${item}`}
                      onClick={() => clearOne(item)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pending ? <SearchSkeleton /> : null}

          {!pending && query.trim() && flatResults.length === 0 ? (
            <SearchEmptyState query={query} />
          ) : null}

          {!pending && response
            ? response.groups.map((group) => (
                <section key={group.id} className="mb-3">
                  <div className="flex items-center justify-between px-3 py-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                      {group.label}
                    </h3>
                    {group.hasMore ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-[#2563EB] hover:underline"
                        onClick={() => {
                          addRecent(query);
                          onOpenChange(false);
                          router.push(
                            `/search?q=${encodeURIComponent(query)}&type=${filter}`,
                          );
                        }}
                      >
                        View all
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const flatIndex = flatResults.findIndex(
                        (row) => row.id === item.id,
                      );
                      return (
                        <SearchResultItem
                          key={item.id}
                          id={`search-option-${flatIndex}`}
                          item={item}
                          query={query}
                          active={flatIndex === activeIndex}
                          onSelect={() => selectResult(item)}
                        />
                      );
                    })}
                  </div>
                </section>
              ))
            : null}
        </div>

        <div className="hidden items-center justify-between border-t border-[#E2E8F0] px-4 py-2 text-[11px] text-[#94A3B8] sm:flex">
          <span>↑↓ navigate · Enter open · Esc close</span>
          <button
            type="button"
            className="font-medium text-[#2563EB] hover:underline"
            onClick={() => {
              onOpenChange(false);
              router.push(
                query.trim()
                  ? `/search?q=${encodeURIComponent(query.trim())}`
                  : "/search",
              );
            }}
          >
            Open search page
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
