"use client";

import { SEARCH_FILTER_CHIPS, type SearchFilterChip } from "@/features/search/types";
import { cn } from "@/lib/utils";

interface SearchFilterChipsProps {
  value: SearchFilterChip;
  onChange: (value: SearchFilterChip) => void;
}

export function SearchFilterChips({ value, onChange }: SearchFilterChipsProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      role="tablist"
      aria-label="Search filters"
    >
      {SEARCH_FILTER_CHIPS.map((chip) => {
        const active = value === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
              active
                ? "border-[#0F172A] bg-[#0F172A] text-white"
                : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]",
            )}
            onClick={() => onChange(chip.id)}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
