import type { SearchResult } from "@/features/search/types";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function matchScore(
  query: string,
  fields: Array<{ value: string | null | undefined; field: string }>,
): { score: number; matchedField: string | null } {
  const q = normalize(query);
  if (!q) {
    return { score: 0, matchedField: null };
  }

  let best = 0;
  let matchedField: string | null = null;

  for (const entry of fields) {
    const raw = entry.value?.trim();
    if (!raw) {
      continue;
    }
    const value = normalize(raw);
    let score = 0;
    if (value === q) {
      score = 100;
    } else if (value.startsWith(q)) {
      score = 80;
    } else if (value.includes(q)) {
      score = 50;
    } else {
      continue;
    }
    if (score > best) {
      best = score;
      matchedField = entry.field;
    }
  }

  return { score: best, matchedField };
}

export function withActivityBonus(
  score: number,
  status: string | null | undefined,
  updatedAt: string | null | undefined,
): number {
  let next = score;
  if (status && !["archived", "inactive", "rejected", "completed"].includes(status)) {
    next += 10;
  }
  if (updatedAt) {
    const ageMs = Date.now() - new Date(updatedAt).getTime();
    if (!Number.isNaN(ageMs) && ageMs < 1000 * 60 * 60 * 24 * 14) {
      next += 5;
    }
  }
  return next;
}

export function sortResults(items: SearchResult[]): SearchResult[] {
  return [...items].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    if (bTime !== aTime) {
      return bTime - aTime;
    }
    return a.title.localeCompare(b.title);
  });
}

export function highlightMatch(text: string, query: string): string {
  const q = query.trim();
  if (!q || !text) {
    return text;
  }
  const index = text.toLowerCase().indexOf(q.toLowerCase());
  if (index < 0) {
    return text;
  }
  const before = text.slice(0, index);
  const match = text.slice(index, index + q.length);
  const after = text.slice(index + q.length);
  return `${before}<mark>${match}</mark>${after}`;
}
