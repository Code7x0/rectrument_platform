"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_INTERVAL_MS = 60_000;
const MIN_REFRESH_GAP_MS = 25_000;

/**
 * Soft real-time sync for Airtable-backed RSC pages.
 *
 * Throttled polling + focus refresh — avoids the previous 15s full-app
 * refresh storm that made navigation feel stuck waiting on Airtable.
 */
export function useLiveDataSync(intervalMs = DEFAULT_INTERVAL_MS): void {
  const router = useRouter();
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    function refresh(force = false) {
      if (document.visibilityState !== "visible") {
        return;
      }
      const now = Date.now();
      if (!force && now - lastRefreshAt.current < MIN_REFRESH_GAP_MS) {
        return;
      }
      lastRefreshAt.current = now;
      router.refresh();
    }

    const timer = window.setInterval(() => refresh(false), intervalMs);

    function onFocus() {
      refresh(false);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        refresh(false);
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
