"use client";

import {
  SEARCH_FILTER_CHIPS,
  searchFilterChipsForRole,
  type SearchFilterChip,
} from "@/features/search/types";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface SearchFilterChipsProps {
  value: SearchFilterChip;
  onChange: (value: SearchFilterChip) => void;
  role?: UserRole;
}

export function SearchFilterChips({
  value,
  onChange,
  role,
}: SearchFilterChipsProps) {
  const chips = role ? searchFilterChipsForRole(role) : SEARCH_FILTER_CHIPS;

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      role="tablist"
      aria-label="Search filters"
    >
      {chips.map((chip) => {
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
