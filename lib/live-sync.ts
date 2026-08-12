/**
 * Cross-component / cross-tab signal that Airtable-backed UI should refresh.
 * Used after successful mutations so the actor's UI updates immediately
 * without waiting for the next poll cycle.
 */

export const LIVE_DATA_CHANGED_EVENT = "rpms:live-data-changed";
export const LIVE_DATA_CHANNEL = "rpms-live-data";

export function signalLiveDataChange(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(LIVE_DATA_CHANGED_EVENT));
  try {
    window.localStorage.setItem(
      LIVE_DATA_CHANGED_EVENT,
      String(Date.now()),
    );
  } catch {
    // private mode / quota — ignore
  }
  try {
    const channel = new BroadcastChannel(LIVE_DATA_CHANNEL);
    channel.postMessage({ at: Date.now() });
    channel.close();
  } catch {
    // BroadcastChannel unsupported — ignore
  }
}

/** Pause background RSC refresh while a form or dialog is open. */
let liveRefreshPauseCount = 0;

export function pauseLiveDataRefresh(): void {
  liveRefreshPauseCount += 1;
}

export function resumeLiveDataRefresh(): void {
  liveRefreshPauseCount = Math.max(0, liveRefreshPauseCount - 1);
}

export function isLiveDataRefreshPaused(): boolean {
  return liveRefreshPauseCount > 0;
}

/** True when a modal dialog is open (Radix). */
export function hasOpenDialog(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return Boolean(
    document.querySelector('[role="dialog"][data-state="open"]'),
  );
}
