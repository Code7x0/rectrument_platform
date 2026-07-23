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
        className="rounded-xl md:hidden"
        aria-label="Open search"
        onClick={openSearch}
      >
        <Search className="h-5 w-5 text-[#64748B]" />
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={openSearch}
      className="relative flex h-10 w-full items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-left text-sm text-[#94A3B8] transition hover:border-[#CBD5E1] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
      aria-label="Open search"
    >
      <Search className="mr-2 h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">Search…</span>
      <kbd className="hidden rounded border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#64748B] sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}
