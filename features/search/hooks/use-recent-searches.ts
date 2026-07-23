"use client";

import { useCallback, useEffect, useState } from "react";

import {
  MAX_RECENT_SEARCHES,
  RECENT_SEARCHES_STORAGE_KEY,
} from "@/features/search/types";

export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setRecent(
          parsed.filter((item): item is string => typeof item === "string").slice(
            0,
            MAX_RECENT_SEARCHES,
          ),
        );
      }
    } catch {
      setRecent([]);
    }
  }, []);

  const persist = useCallback((next: string[]) => {
    setRecent(next);
    try {
      window.localStorage.setItem(
        RECENT_SEARCHES_STORAGE_KEY,
        JSON.stringify(next.slice(0, MAX_RECENT_SEARCHES)),
      );
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const addRecent = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }
      persist([
        trimmed,
        ...recent.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES));
    },
    [persist, recent],
  );

  const clearOne = useCallback(
    (query: string) => {
      persist(recent.filter((item) => item !== query));
    },
    [persist, recent],
  );

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  return { recent, addRecent, clearOne, clearAll };
}
