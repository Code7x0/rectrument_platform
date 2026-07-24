/**
 * Business ID helpers — Client Code, Partner Code, Job ID.
 * Airtable record ids (rec…) stay internal; these are display/search codes only.
 */

export const JOB_ID_MARKER_PREFIX = "[RP_JOBID]";

/** Valid Partner Code: HN_254 or HN_254_2 */
export const PARTNER_CODE_RE = /^[A-Z]{2}_\d{3}(?:_\d+)?$/;

/** Valid Job ID: AB_001 or IBM_012 */
export const JOB_CODE_RE = /^[A-Z0-9]+_\d{3}$/;

/** Synthetic / legacy display fallbacks we must never show as business IDs. */
export function isSyntheticDisplayId(value: string | null | undefined): boolean {
  if (!value?.trim()) {
    return true;
  }
  const v = value.trim();
  return (
    /^rec[A-Za-z0-9]+$/.test(v) ||
    /^(CLI|PRT|TP|JOB|SUB)-/i.test(v) ||
    v.startsWith("jp_")
  );
}

export function isValidPartnerCode(value: string | null | undefined): boolean {
  if (!value?.trim() || isSyntheticDisplayId(value)) {
    return false;
  }
  return PARTNER_CODE_RE.test(value.trim().toUpperCase());
}

export function isValidJobCode(value: string | null | undefined): boolean {
  if (!value?.trim() || isSyntheticDisplayId(value)) {
    return false;
  }
  return JOB_CODE_RE.test(value.trim().toUpperCase());
}

export function isValidClientCode(value: string | null | undefined): boolean {
  if (!value?.trim() || isSyntheticDisplayId(value)) {
    return false;
  }
  // Existing convention: short alphanumeric codes (AB, IBM, EXP, ALT, ACC, VSE…)
  return /^[A-Z0-9]{2,12}$/i.test(value.trim());
}

/**
 * Partner Code base: <FirstInitial><LastInitial>_<Last3DigitsOfMobile>
 * Example: Harini Narendran + 9840467254 → HN_254
 */
export function buildPartnerCodeBase(
  fullName: string | null | undefined,
  phone: string | null | undefined,
): string {
  const parts = (fullName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstInitial = (parts[0]?.[0] ?? "X").toUpperCase();
  const lastInitial = (
    parts.length > 1
      ? (parts[parts.length - 1]?.[0] ?? "X")
      : (parts[0]?.[1] ?? "X")
  ).toUpperCase();
  const digits = (phone ?? "").replace(/\D/g, "");
  const last3 = (digits.slice(-3) || "000").padStart(3, "0");
  return `${firstInitial}${lastInitial}_${last3}`;
}

/**
 * Allocate unique Partner Code among existing codes (case-insensitive).
 * Base → base_2 → base_3 …
 */
export function allocateUniquePartnerCode(
  base: string,
  existingCodes: Iterable<string>,
): string {
  const normalizedBase = base.trim().toUpperCase();
  const taken = new Set(
    [...existingCodes]
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
  );

  if (!taken.has(normalizedBase)) {
    return normalizedBase;
  }

  let suffix = 2;
  while (taken.has(`${normalizedBase}_${suffix}`)) {
    suffix += 1;
  }
  return `${normalizedBase}_${suffix}`;
}

export function formatJobCode(clientCode: string, sequence: number): string {
  const code = clientCode.trim().toUpperCase();
  const seq = String(Math.max(1, Math.floor(sequence))).padStart(3, "0");
  return `${code}_${seq}`;
}

/**
 * Next sequence for a client from existing job codes (same client code prefix).
 */
export function nextJobSequence(
  clientCode: string,
  existingJobCodes: Iterable<string>,
): number {
  const prefix = `${clientCode.trim().toUpperCase()}_`;
  let max = 0;
  for (const raw of existingJobCodes) {
    const code = raw.trim().toUpperCase();
    if (!code.startsWith(prefix)) {
      continue;
    }
    const rest = code.slice(prefix.length);
    const match = /^(\d{3})(?:_|$)/.exec(rest) ?? /^(\d+)$/.exec(rest);
    if (!match?.[1]) {
      continue;
    }
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > max) {
      max = n;
    }
  }
  return max + 1;
}

export function buildJobIdMarker(jobCode: string): string {
  return `${JOB_ID_MARKER_PREFIX} ${jobCode.trim().toUpperCase()}`;
}

export function parseJobIdMarker(
  comments: string | null | undefined,
): string | null {
  if (!comments?.trim()) {
    return null;
  }
  const match = /\[RP_JOBID\]\s+([A-Z0-9]+_\d{3})\b/i.exec(comments);
  return match?.[1] ? match[1].toUpperCase() : null;
}

/** Upsert [RP_JOBID] line; preserves other comment content. */
export function upsertJobIdMarker(
  existing: string | null | undefined,
  jobCode: string,
): string {
  const marker = buildJobIdMarker(jobCode);
  const lines = (existing ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => !line.trim().startsWith(JOB_ID_MARKER_PREFIX));
  lines.unshift(marker);
  return lines.filter((line, index) => line.trim() || index > 0).join("\n").trim();
}

/** Strip job-id marker lines from comments used as description text. */
export function stripJobIdMarker(
  comments: string | null | undefined,
): string | null {
  if (!comments?.trim()) {
    return null;
  }
  const cleaned = comments
    .split("\n")
    .filter((line) => !line.trim().startsWith(JOB_ID_MARKER_PREFIX))
    .join("\n")
    .trim();
  return cleaned || null;
}

/** Prefer business code for UI; never show synthetic/rec fallbacks. */
export function displayBusinessId(
  value: string | null | undefined,
  empty = "—",
): string {
  if (!value?.trim() || isSyntheticDisplayId(value)) {
    return empty;
  }
  return value.trim();
}
