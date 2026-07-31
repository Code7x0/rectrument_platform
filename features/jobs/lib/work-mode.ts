/**
 * Derive WFO / WFH from Jobs.Location (no dedicated Airtable work-mode column).
 * City / office locations → WFO; remote / WFH wording → WFH.
 */
export type JobWorkMode = "WFO" | "WFH";

export function deriveJobWorkMode(
  location: string | null | undefined,
): JobWorkMode | null {
  const raw = location?.trim();
  if (!raw) {
    return null;
  }

  const value = raw.toLowerCase();

  if (
    /\bwfh\b/.test(value) ||
    /work\s*from\s*home/.test(value) ||
    /\bremote\b/.test(value) ||
    /\bworkfromhome\b/.test(value)
  ) {
    return "WFH";
  }

  if (
    /\bwfo\b/.test(value) ||
    /work\s*from\s*office/.test(value) ||
    /\bonsite\b/.test(value) ||
    /\bon[\s-]?site\b/.test(value) ||
    /\boffice\b/.test(value)
  ) {
    return "WFO";
  }

  // City / region codes (BLR, HYD, Bangalore, …) imply office presence.
  return "WFO";
}
