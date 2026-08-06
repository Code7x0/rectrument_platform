"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  LIVE_DATA_CHANGED_EVENT,
  LIVE_DATA_CHANNEL,
} from "@/lib/live-sync";

/** Cheap pulse poll — only full RSC refresh when the fingerprint changes. */
const PULSE_INTERVAL_MS = 4_000;
/**
 * Safety-net full refresh even if pulse is quiet (Airtable direct edits).
 * Status changes outside the pulse sample still need a periodic reload.
 */
const FULL_REFRESH_INTERVAL_MS = 15_000;
const MIN_FULL_REFRESH_GAP_MS = 2_500;

/**
 * Soft real-time sync for Airtable-backed RSC pages.
 *
 * Strategy:
 * 1. Poll /api/sync/pulse every 4s (notification + CRM fingerprint)
 * 2. Full router.refresh() only when pulse changes, on focus, or after mutations
 * 3. Safety-net full refresh every 15s while the tab is visible (Airtable direct edits)
 */
export function useLiveDataSync(): void {
  const router = useRouter();
  const lastFullRefreshAt = useRef(0);
  const lastPulse = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function fullRefresh(force = false) {
      if (document.visibilityState !== "visible") {
        return;
      }
      const now = Date.now();
      if (!force && now - lastFullRefreshAt.current < MIN_FULL_REFRESH_GAP_MS) {
        return;
      }
      lastFullRefreshAt.current = now;
      router.refresh();
    }

    async function checkPulse() {
      if (document.visibilityState !== "visible" || cancelled) {
        return;
      }
      try {
        const response = await fetch("/api/sync/pulse", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as {
          fingerprint?: string;
        };
        const next = data.fingerprint ?? "";
        if (lastPulse.current === null) {
          lastPulse.current = next;
          return;
        }
        if (next !== lastPulse.current) {
          lastPulse.current = next;
          fullRefresh(true);
        }
      } catch {
        // Network blip — ignore; safety-net refresh still runs
      }
    }

    const pulseTimer = window.setInterval(checkPulse, PULSE_INTERVAL_MS);
    const fullTimer = window.setInterval(
      () => fullRefresh(false),
      FULL_REFRESH_INTERVAL_MS,
    );

    void checkPulse();

    function onFocus() {
      void checkPulse();
      fullRefresh(false);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void checkPulse();
        fullRefresh(false);
      }
    }

    function onLocalSignal() {
      fullRefresh(true);
    }

    function onStorage(event: StorageEvent) {
      if (event.key === LIVE_DATA_CHANGED_EVENT) {
        fullRefresh(true);
      }
    }

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(LIVE_DATA_CHANNEL);
      channel.onmessage = () => fullRefresh(true);
    } catch {
      channel = null;
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(LIVE_DATA_CHANGED_EVENT, onLocalSignal);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.clearInterval(pulseTimer);
      window.clearInterval(fullTimer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(LIVE_DATA_CHANGED_EVENT, onLocalSignal);
      window.removeEventListener("storage", onStorage);
      channel?.close();
    };
  }, [router]);
}
