import { SearchPageClient } from "@/features/search/components";
import { globalSearch } from "@/features/search/services";
import type { SearchFilterChip } from "@/features/search/types";
import { SEARCH_FILTER_CHIPS } from "@/features/search/types";
import { requireAuth } from "@/lib/auth";

function parseFilter(value: string | undefined): SearchFilterChip {
  if (
    value &&
    SEARCH_FILTER_CHIPS.some((chip) => chip.id === value)
  ) {
    return value as SearchFilterChip;
  }
  return "all";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const filter = parseFilter(params.type);

  const initial = query
    ? await globalSearch(session, { query, filter, mode: "page" })
    : null;

  return (
    <SearchPageClient
      initialQuery={query}
      initialFilter={filter}
      initial={initial}
    />
  );
}
