"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_INTERVAL_MS = 15_000;

/**
 * Soft real-time sync for Airtable-backed RSC pages.
 *
 * Airtable has no webhook in this stack. Polling + focus/visibility refresh
 * keeps dashboards, candidate lists, and counts aligned with the live base
 * without requiring a manual browser refresh — including edits made directly
 * in Airtable.
 */
export function useLiveDataSync(intervalMs = DEFAULT_INTERVAL_MS): void {
  const router = useRouter();

  useEffect(() => {
    function refresh() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    const timer = window.setInterval(refresh, intervalMs);

    function onFocus() {
      refresh();
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);
}
