"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { SearchModal } from "@/features/search/components/search-modal";

interface SearchContextValue {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Keep the dialog out of the tree until first open — avoids Radix portal
  // teardown races with React 19 during dashboard route transitions.
  const [hasOpened, setHasOpened] = useState(false);

  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);
  const toggleSearch = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isShortcut =
        (event.key === "k" || event.key === "K") &&
        (event.metaKey || event.ctrlKey);
      if (!isShortcut) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        target?.isContentEditable
      ) {
        // Still allow Cmd/Ctrl+K from inputs to open search (Linear style)
      }
      event.preventDefault();
      toggleSearch();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSearch]);

  useEffect(() => {
    if (open) {
      setHasOpened(true);
    }
  }, [open]);

  const value = useMemo(
    () => ({ open, openSearch, closeSearch, toggleSearch }),
    [open, openSearch, closeSearch, toggleSearch],
  );

  return (
    <SearchContext.Provider value={value}>
      {children}
      {hasOpened ? (
        <SearchModal open={open} onOpenChange={setOpen} />
      ) : null}
    </SearchContext.Provider>
  );
}

export function useSearchPalette(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearchPalette must be used within SearchProvider");
  }
  return context;
}
