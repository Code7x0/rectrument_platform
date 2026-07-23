/**
 * Structured markers stored inside existing free-text Airtable fields
 * (Comments, Communications, Performance Notes) — no schema changes.
 */

export const INVITE_MARKER_PREFIX = "invite:";
export const PAYOUT_MARKER_PREFIX = "[RP_PAYOUT]";
export const DOC_MARKER_PREFIX = "[RP_DOC]";

export function buildInviteMarker(token: string, expiry: string | null): string {
  return `${INVITE_MARKER_PREFIX}${token}:${expiry ?? ""}`;
}

export function parseInviteMarker(
  comments: string | null | undefined,
): { token: string; expiry: string | null } | null {
  if (!comments?.trim()) {
    return null;
  }
  const match = /invite:([A-Za-z0-9_-]+)(?::([^\s\]]*))?/.exec(comments);
  if (!match?.[1]) {
    return null;
  }
  return {
    token: match[1],
    expiry: match[2]?.trim() ? match[2].trim() : null,
  };
}

export type PayoutMarker = {
  submissionId: string;
  status: string;
  amount: number | null;
  paidDate: string | null;
};

export function buildPayoutMarker(marker: PayoutMarker): string {
  const amount =
    marker.amount != null && Number.isFinite(marker.amount)
      ? String(marker.amount)
      : "";
  return `${PAYOUT_MARKER_PREFIX} id=${marker.submissionId} status=${marker.status} amount=${amount} paid=${marker.paidDate ?? ""}`;
}

export function parsePayoutMarkers(text: string | null | undefined): PayoutMarker[] {
  if (!text?.trim()) {
    return [];
  }
  const markers: PayoutMarker[] = [];
  const re =
    /\[RP_PAYOUT\]\s+id=(rec[A-Za-z0-9]+)\s+status=([a-z_]+)\s+amount=([^\s]*)\s+paid=([^\s\[]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const amountRaw = match[3] ?? "";
    const amount = amountRaw ? Number(amountRaw) : null;
    markers.push({
      submissionId: match[1]!,
      status: match[2]!,
      amount: amount != null && Number.isFinite(amount) ? amount : null,
      paidDate: match[4]?.trim() ? match[4].trim() : null,
    });
  }
  return markers;
}

export function upsertPayoutMarker(
  existing: string | null | undefined,
  marker: PayoutMarker,
): string {
  const lines = (existing ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith(PAYOUT_MARKER_PREFIX) || !line.includes(`id=${marker.submissionId}`));
  lines.push(buildPayoutMarker(marker));
  return lines.join("\n");
}

export type DocMarker = {
  filename: string;
  status: "pending" | "verified" | "rejected";
  reason: string | null;
  at: string | null;
};

export function buildDocMarker(marker: DocMarker): string {
  const safeName = marker.filename.replace(/\s+/g, "_");
  return `${DOC_MARKER_PREFIX} file=${safeName} status=${marker.status} reason=${marker.reason ?? ""} at=${marker.at ?? ""}`;
}

export function parseDocMarkers(text: string | null | undefined): DocMarker[] {
  if (!text?.trim()) {
    return [];
  }
  const markers: DocMarker[] = [];
  const re =
    /\[RP_DOC\]\s+file=([^\s]+)\s+status=(pending|verified|rejected)\s+reason=([^\s]*)\s+at=([^\s\[]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    markers.push({
      filename: match[1]!.replace(/_/g, " "),
      status: match[2] as DocMarker["status"],
      reason: match[3]?.trim() ? match[3].trim() : null,
      at: match[4]?.trim() ? match[4].trim() : null,
    });
  }
  return markers;
}

export function upsertDocMarker(
  existing: string | null | undefined,
  marker: DocMarker,
): string {
  const safeName = marker.filename.replace(/\s+/g, "_");
  const lines = (existing ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !line.startsWith(DOC_MARKER_PREFIX) || !line.includes(`file=${safeName}`),
    );
  lines.push(buildDocMarker(marker));
  return lines.join("\n");
}

/** Strip [RP_DOC] / [RP_PAYOUT] lines for human-editable notes display. */
export function stripSystemMarkers(
  text: string | null | undefined,
): string {
  if (!text?.trim()) {
    return "";
  }
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !line.startsWith(DOC_MARKER_PREFIX) &&
        !line.startsWith(PAYOUT_MARKER_PREFIX),
    )
    .join("\n");
}

/**
 * Keep system markers when writing user notes into the same Airtable field.
 */
export function mergeNotesPreservingMarkers(
  existing: string | null | undefined,
  userNotes: string | null | undefined,
): string {
  const markerLines = (existing ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        line.startsWith(DOC_MARKER_PREFIX) ||
        line.startsWith(PAYOUT_MARKER_PREFIX),
    );
  const notes = (userNotes ?? "").trim();
  if (!notes) {
    return markerLines.join("\n");
  }
  return [...markerLines, notes].join("\n");
}
