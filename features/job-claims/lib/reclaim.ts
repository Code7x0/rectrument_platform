/**
 * Configurable Partner reclaim wait after a rejected claim.
 * Default 48 hours — client may confirm a different value.
 * AM direct allocation is NOT affected by this setting.
 */
export function getJobClaimReclaimHours(): number {
  const raw = process.env.JOB_CLAIM_RECLAIM_HOURS?.trim();
  if (!raw) {
    return 48;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 48;
  }
  return parsed;
}

export function isReclaimAvailable(
  reclaimAvailableAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!reclaimAvailableAt) {
    return true;
  }
  const at = Date.parse(reclaimAvailableAt);
  if (!Number.isFinite(at)) {
    return true;
  }
  return now.getTime() >= at;
}

/** Human label e.g. "Available to reclaim in 18 hours". */
export function formatReclaimAvailability(
  reclaimAvailableAt: string | null | undefined,
  now: Date = new Date(),
): string {
  if (isReclaimAvailable(reclaimAvailableAt, now)) {
    return "Reclaim available";
  }
  const at = Date.parse(reclaimAvailableAt!);
  const ms = Math.max(0, at - now.getTime());
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours <= 1) {
    const minutes = Math.max(1, Math.ceil(ms / (60 * 1000)));
    return `Available to reclaim in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  return `Available to reclaim in ${hours} hour${hours === 1 ? "" : "s"}`;
}
