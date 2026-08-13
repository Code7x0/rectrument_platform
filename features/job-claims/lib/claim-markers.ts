/**
 * Job claim markers in Jobs.Comments — durable across Vercel instances.
 * No new Airtable fields.
 *
 * Example:
 * [RP_CLAIM] id=clm_abc partner=recP status=pending am=recA at=2026-01-01T00:00:00.000Z reviewed= reviewedBy= reason= alloc=
 */

import type { JobClaim, JobClaimStatus } from "@/features/job-claims/types";

export const CLAIM_MARKER_PREFIX = "[RP_CLAIM]";

function enc(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return encodeURIComponent(value);
}

function dec(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function buildClaimMarker(claim: JobClaim): string {
  return [
    CLAIM_MARKER_PREFIX,
    `id=${claim.id}`,
    `partner=${claim.partnerId}`,
    `status=${claim.status}`,
    `am=${claim.accountManagerId ?? "none"}`,
    `at=${claim.requestedAt}`,
    `reviewed=${claim.reviewedAt ?? ""}`,
    `reviewedBy=${claim.reviewedByUserId ?? ""}`,
    `reason=${enc(claim.rejectionReason)}`,
    `alloc=${claim.allocationId ?? ""}`,
  ].join(" ");
}

export function parseClaimMarkers(
  text: string | null | undefined,
  jobId: string,
): JobClaim[] {
  if (!text?.trim()) {
    return [];
  }
  const claims: JobClaim[] = [];
  const re =
    /\[RP_CLAIM\]\s+id=(clm_[A-Za-z0-9]+)\s+partner=(rec[A-Za-z0-9]+)\s+status=(pending|approved|rejected)\s+am=(rec[A-Za-z0-9]+|none)\s+at=([^\s]+)\s+reviewed=([^\s]*)\s+reviewedBy=([^\s]*)\s+reason=([^\s]*)\s+alloc=([^\s\[]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const status = match[3] as JobClaimStatus;
    claims.push({
      id: match[1]!,
      partnerId: match[2]!,
      jobId,
      accountManagerId: match[4] === "none" ? null : match[4]!,
      status,
      requestedAt: match[5]!,
      reviewedAt: match[6]?.trim() ? match[6].trim() : null,
      reviewedByUserId: match[7]?.trim() ? match[7].trim() : null,
      rejectionReason: dec(match[8]),
      allocationId: match[9]?.trim() ? match[9].trim() : null,
    });
  }
  return claims;
}

export function upsertClaimMarker(
  existing: string | null | undefined,
  claim: JobClaim,
): string {
  const lines = (existing ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !(
          line.startsWith(CLAIM_MARKER_PREFIX) &&
          line.includes(`id=${claim.id}`)
        ),
    );
  lines.push(buildClaimMarker(claim));
  return lines.join("\n");
}

export function stripClaimMarkers(text: string | null | undefined): string {
  if (!text?.trim()) {
    return "";
  }
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith(CLAIM_MARKER_PREFIX))
    .join("\n");
}
