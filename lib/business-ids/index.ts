/**
 * Business ID helpers — Client Code, Partner Code, Job ID.
 * Airtable record ids (rec…) stay internal; these are display/search codes only.
 */

export const JOB_ID_MARKER_PREFIX = "[RP_JOBID]";

/** Valid Partner Code: HN_254 or HN_254_2 */
export const PARTNER_CODE_RE = /^[A-Z]{2}_\d{3}(?:_\d+)?$/;

/**
 * Candidate ID: DMYY_xx99 (no leading zeros, lowercase name+phone).
 * Example: 5 Aug 2026 + Sonu Kumar + phone …42 → 5826_sk42
 * Collision suffix: 5826_sk42_2
 */
export const CANDIDATE_CODE_RE = /^\d{4,6}_[a-z]{2}\d{2}(?:_\d+)?$/;

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
    /^(CLI|PRT|TP|JOB|SUB|ALL)-/i.test(v) ||
    v.startsWith("jp_") ||
    /rec[A-Za-z0-9]+_rec[A-Za-z0-9]+/.test(v)
  );
}

export function isValidPartnerCode(value: string | null | undefined): boolean {
  if (!value?.trim() || isSyntheticDisplayId(value)) {
    return false;
  }
  return PARTNER_CODE_RE.test(value.trim().toUpperCase());
}

export function isValidCandidateCode(value: string | null | undefined): boolean {
  if (!value?.trim() || isSyntheticDisplayId(value) || /^\d+$/.test(value.trim())) {
    return false;
  }
  return CANDIDATE_CODE_RE.test(value.trim().toLowerCase());
}

export function normalizeCandidateCode(value: string): string {
  return value.trim().toLowerCase();
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
 * Client ID base from name — e.g. "test client" → TC, "Acme" → ACM, "IBM India" → II.
 */
export function buildClientCodeBase(name: string | null | undefined): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);

  if (parts.length === 0) {
    return "CL";
  }

  if (parts.length === 1) {
    const word = parts[0]!.toUpperCase();
    if (word.length >= 3) {
      return word.slice(0, 3);
    }
    if (word.length === 2) {
      return word;
    }
    return `${word}X`;
  }

  const initials = parts
    .slice(0, 3)
    .map((part) => part[0]!.toUpperCase())
    .join("");
  return initials.length >= 2 ? initials : `${initials}X`;
}

/**
 * Allocate unique Client ID among existing codes (case-insensitive).
 * Base → base2 → base3 …
 */
export function allocateUniqueClientCode(
  base: string,
  existingCodes: Iterable<string>,
): string {
  const normalizedBase = base.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const seed =
    normalizedBase.length >= 2
      ? normalizedBase.slice(0, 12)
      : (normalizedBase + "CL").slice(0, 2);

  const taken = new Set(
    [...existingCodes]
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
  );

  if (!taken.has(seed)) {
    return seed;
  }

  let suffix = 2;
  while (true) {
    const candidate = `${seed}${suffix}`.slice(0, 12);
    if (!taken.has(candidate)) {
      return candidate;
    }
    suffix += 1;
  }
}

/**
 * Account Manager business ID: short letters + last 2 phone digits.
 * Example: Vinit Puri + …98 → VPR98 (first initial + first two of last name + digits).
 * Shown to Talent Partners; Admin / Super Admin use names in the UI.
 */
export const AM_CODE_RE = /^[A-Z]{2,4}\d{2}(?:_\d+)?$/;

export const AM_CODE_MARKER_PREFIX = "[RP_AMCODE]";

export function isValidAmCode(value: string | null | undefined): boolean {
  if (!value?.trim() || isSyntheticDisplayId(value)) {
    return false;
  }
  return AM_CODE_RE.test(value.trim().toUpperCase());
}

export function buildAmCodeBase(
  fullName: string | null | undefined,
  phone: string | null | undefined,
): string {
  const parts = (fullName ?? "")
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z]/g, ""))
    .filter(Boolean);

  const consonants = (word: string) =>
    word.replace(/[AEIOU]/gi, "").toUpperCase();

  let letters = "AM";
  if (parts.length === 1) {
    const word = parts[0]!.toUpperCase();
    letters = (word.slice(0, 3) + "X").slice(0, 3);
  } else if (parts.length === 2) {
    // Vinit Puri → V + PR (consonants of last name) → VPR
    const first = parts[0]!.toUpperCase();
    const last = parts[1]!.toUpperCase();
    const lastChunk = ((consonants(last) || last) + last).slice(0, 2);
    letters = `${first[0]}${lastChunk}`;
  } else {
    // John Michael Smith → JMS
    const first = parts[0]!.toUpperCase();
    const middle = parts[1]!.toUpperCase();
    const last = parts[parts.length - 1]!.toUpperCase();
    letters = `${first[0]}${middle[0]}${last[0]}`;
  }

  const digits = (phone ?? "").replace(/\D/g, "");
  const last2 = (digits.slice(-2) || "00").padStart(2, "0");
  return `${letters}${last2}`;
}

export function allocateUniqueAmCode(
  base: string,
  existingCodes: Iterable<string>,
): string {
  const normalizedBase = base.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const seed =
    normalizedBase.length >= 4
      ? normalizedBase.slice(0, 8)
      : (normalizedBase + "AM00").slice(0, 5);

  const taken = new Set(
    [...existingCodes]
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
  );

  if (!taken.has(seed)) {
    return seed;
  }

  let suffix = 2;
  while (taken.has(`${seed}_${suffix}`)) {
    suffix += 1;
  }
  return `${seed}_${suffix}`;
}

export function parseAmCodeMarker(
  comments: string | null | undefined,
): string | null {
  if (!comments?.trim()) {
    return null;
  }
  const match = /\[RP_AMCODE\]\s+([A-Z0-9_]+)\b/i.exec(comments);
  const code = match?.[1]?.toUpperCase() ?? null;
  return code && isValidAmCode(code) ? code : null;
}

export function upsertAmCodeMarker(
  existing: string | null | undefined,
  amCode: string,
): string {
  const marker = `${AM_CODE_MARKER_PREFIX} ${amCode.trim().toUpperCase()}`;
  const lines = (existing ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => !line.trim().startsWith(AM_CODE_MARKER_PREFIX));
  lines.unshift(marker);
  return lines.filter((line, index) => line.trim() || index > 0).join("\n").trim();
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

function candidateDateStamp(
  submittedAt: Date,
  timeZone = "Asia/Kolkata",
): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(submittedAt);
  const day = String(Number(parts.find((part) => part.type === "day")?.value ?? "1"));
  const month = String(
    Number(parts.find((part) => part.type === "month")?.value ?? "1"),
  );
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  return `${day}${month}${year.slice(-2)}`;
}

export function buildCandidateCodeBase(
  fullName: string | null | undefined,
  phone: string | null | undefined,
  submittedAt: Date = new Date(),
): string {
  const parts = (fullName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstInitial = (parts[0]?.[0] ?? "x").toLowerCase();
  const lastInitial = (
    parts.length > 1
      ? (parts[parts.length - 1]?.[0] ?? "x")
      : (parts[0]?.[1] ?? "x")
  ).toLowerCase();
  const digits = (phone ?? "").replace(/\D/g, "");
  const last2 = (digits.slice(-2) || "00").padStart(2, "0");
  return `${candidateDateStamp(submittedAt)}_${firstInitial}${lastInitial}${last2}`;
}

export function allocateUniqueCandidateCode(
  base: string,
  existingCodes: Iterable<string>,
): string {
  const seed = normalizeCandidateCode(base);
  const taken = new Set(
    [...existingCodes]
      .map((code) => code.trim().toLowerCase())
      .filter(Boolean),
  );

  if (!taken.has(seed)) {
    return seed;
  }

  let suffix = 2;
  while (taken.has(`${seed}_${suffix}`)) {
    suffix += 1;
  }
  return `${seed}_${suffix}`;
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

/**
 * Per-job Account Manager(s) on the locked client Jobs table (no AM link column).
 * Stored in Comments alongside [RP_JOBID] — does not change Airtable schema.
 *
 * - `[RP_AM] recXXX` — single assignment
 * - `[RP_AM] recXXX,recYYY` — multiple AMs on one job
 * - `[RP_AM] none` — explicitly unassigned (do NOT inherit Client Account Owner)
 * - no marker — inherit Client Account Owner when present
 */
export const JOB_AM_MARKER_PREFIX = "[RP_AM]";
export const JOB_AM_UNASSIGNED_TOKEN = "none";

export type JobAmAssignment =
  | { kind: "assigned"; accountManagerIds: string[]; accountManagerId: string }
  | { kind: "unassigned" };

function normalizeJobAmIds(
  value: string | string[] | null | undefined,
): string[] {
  if (value == null) {
    return [];
  }
  const raw = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      raw
        .flatMap((part) => String(part).split(/[,\s]+/))
        .map((id) => id.trim())
        .filter((id) => /^rec[a-zA-Z0-9]+$/.test(id)),
    ),
  );
}

export function buildJobAmMarker(
  accountManagerId: string | string[],
): string {
  const ids = normalizeJobAmIds(accountManagerId);
  return `${JOB_AM_MARKER_PREFIX} ${ids.join(",")}`;
}

export function buildJobAmUnassignedMarker(): string {
  return `${JOB_AM_MARKER_PREFIX} ${JOB_AM_UNASSIGNED_TOKEN}`;
}

export function parseJobAmAssignment(
  comments: string | null | undefined,
): JobAmAssignment | null {
  if (!comments?.trim()) {
    return null;
  }
  const match = /\[RP_AM\]\s+([^\n]+)/.exec(comments);
  if (!match?.[1]) {
    return null;
  }
  const value = match[1].trim();
  const firstToken = value.split(/[,\s]+/)[0]?.trim().toLowerCase() ?? "";
  if (firstToken === JOB_AM_UNASSIGNED_TOKEN || firstToken === "-") {
    return { kind: "unassigned" };
  }
  const accountManagerIds = normalizeJobAmIds(value);
  if (accountManagerIds.length === 0) {
    return null;
  }
  return {
    kind: "assigned",
    accountManagerIds,
    accountManagerId: accountManagerIds[0]!,
  };
}

/** Primary assigned Airtable AM id; null when unmarked or explicitly unassigned. */
export function parseJobAmMarker(
  comments: string | null | undefined,
): string | null {
  const assignment = parseJobAmAssignment(comments);
  return assignment?.kind === "assigned" ? assignment.accountManagerId : null;
}

/**
 * Upsert [RP_AM] line.
 * Pass null/empty to write an explicit unassigned marker (blocks client inherit).
 * Pass one or more record ids to assign. Use stripJobAmMarker to remove the line.
 */
export function upsertJobAmMarker(
  existing: string | null | undefined,
  accountManagerId: string | string[] | null | undefined,
): string {
  const lines = (existing ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => !line.trim().startsWith(JOB_AM_MARKER_PREFIX));

  const ids = normalizeJobAmIds(accountManagerId);
  const marker =
    ids.length > 0 ? buildJobAmMarker(ids) : buildJobAmUnassignedMarker();

  const jobIdIdx = lines.findIndex((line) =>
    line.trim().startsWith(JOB_ID_MARKER_PREFIX),
  );
  if (jobIdIdx >= 0) {
    lines.splice(jobIdIdx + 1, 0, marker);
  } else {
    lines.unshift(marker);
  }

  return lines.filter((line, index) => line.trim() || index > 0).join("\n").trim();
}

export function stripJobAmMarker(
  comments: string | null | undefined,
): string | null {
  if (!comments?.trim()) {
    return null;
  }
  const cleaned = comments
    .split("\n")
    .filter((line) => !line.trim().startsWith(JOB_AM_MARKER_PREFIX))
    .join("\n")
    .trim();
  return cleaned || null;
}

/** Strip all RP system markers from Comments for UI display. */
export function stripJobSystemMarkers(
  comments: string | null | undefined,
): string | null {
  const withoutClaims = stripJobClaimMarkers(
    stripPartnerAssignedByMarkers(
      stripJobAmMarker(stripJobIdMarker(comments)),
    ),
  );
  return withoutClaims || null;
}

const JOB_CLAIM_MARKER_PREFIX = "[RP_CLAIM]";

function stripJobClaimMarkers(
  comments: string | null | undefined,
): string | null {
  if (!comments?.trim()) {
    return null;
  }
  const cleaned = comments
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith(JOB_CLAIM_MARKER_PREFIX))
    .join("\n")
    .trim();
  return cleaned || null;
}

/**
 * Who allocated a partner on a job (job_partners mode — no Allocations table).
 * One line per partner: `[RP_PARTNER_BY] <partnerRecId> <userRecId>`
 */
export const PARTNER_ASSIGNED_BY_PREFIX = "[RP_PARTNER_BY]";

export function parsePartnerAssignedByMap(
  comments: string | null | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!comments?.trim()) {
    return map;
  }
  for (const line of comments.split("\n")) {
    const match =
      /\[RP_PARTNER_BY\]\s+(rec[a-zA-Z0-9]+)\s+(rec[a-zA-Z0-9]+)\b/.exec(
        line.trim(),
      );
    if (match?.[1] && match[2]) {
      map.set(match[1], match[2]);
    }
  }
  return map;
}

export function upsertPartnerAssignedByMarker(
  existing: string | null | undefined,
  partnerId: string,
  assignedByUserId: string,
): string {
  const partner = partnerId.trim();
  const userId = assignedByUserId.trim();
  const lines = (existing ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => {
      const match =
        /\[RP_PARTNER_BY\]\s+(rec[a-zA-Z0-9]+)\s+/.exec(line.trim());
      return !(match?.[1] === partner);
    });
  if (partner && userId) {
    lines.push(`${PARTNER_ASSIGNED_BY_PREFIX} ${partner} ${userId}`);
  }
  return lines.filter((line, index) => line.trim() || index > 0).join("\n").trim();
}

export function removePartnerAssignedByMarker(
  existing: string | null | undefined,
  partnerId: string,
): string {
  const partner = partnerId.trim();
  const lines = (existing ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => {
      const match =
        /\[RP_PARTNER_BY\]\s+(rec[a-zA-Z0-9]+)\s+/.exec(line.trim());
      return !(match?.[1] === partner);
    });
  return lines.filter((line, index) => line.trim() || index > 0).join("\n").trim();
}

export function stripPartnerAssignedByMarkers(
  comments: string | null | undefined,
): string | null {
  if (!comments?.trim()) {
    return null;
  }
  const cleaned = comments
    .split("\n")
    .filter((line) => !line.trim().startsWith(PARTNER_ASSIGNED_BY_PREFIX))
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
