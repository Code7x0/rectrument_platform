"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSearchPalette } from "@/features/search/components/search-provider";

interface SearchTriggerProps {
  variant?: "navbar" | "icon";
}

export function SearchTrigger({ variant = "navbar" }: SearchTriggerProps) {
  const { openSearch } = useSearchPalette();

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-lg md:hidden"
        aria-label="Open search"
        onClick={openSearch}
      >
        <Search className="h-5 w-5 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={openSearch}
      className="relative flex h-10 w-full items-center rounded-lg border border-border bg-muted/50 px-3 text-left text-sm text-muted-foreground shadow-xs transition-ui hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Open search"
    >
      <Search className="mr-2 h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">Search…</span>
      <kbd className="hidden rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}
