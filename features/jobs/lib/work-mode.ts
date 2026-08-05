/**
 * Resolve WFO / WFH from Jobs.Work Mode when present, else infer from Location.
 */
export type JobWorkMode = "WFO" | "WFH" | "Hybrid";

function classifyWorkModeText(raw: string): JobWorkMode | null {
  const value = raw.toLowerCase();

  if (
    /\bwfh\b/.test(value) ||
    /work\s*from\s*home/.test(value) ||
    /\bremote\b/.test(value) ||
    /\bworkfromhome\b/.test(value)
  ) {
    return "WFH";
  }

  if (/\bhybrid\b/.test(value)) {
    return "Hybrid";
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

  return null;
}

export function deriveJobWorkMode(
  location: string | null | undefined,
  explicitWorkMode?: string | null,
): JobWorkMode | null {
  const fromField = explicitWorkMode?.trim();
  if (fromField) {
    return classifyWorkModeText(fromField) ?? (fromField as JobWorkMode);
  }

  const raw = location?.trim();
  if (!raw) {
    return null;
  }

  const classified = classifyWorkModeText(raw);
  if (classified) {
    return classified;
  }

  // City / region codes (BLR, HYD, Bangalore, …) imply office presence.
  return "WFO";
}
