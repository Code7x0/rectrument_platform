import { CLIENT_MODE_OF_WORK_OPTIONS } from "@/features/clients/schemas/client.schema";

/**
 * Map Airtable Mode Of Work (e.g. "WFO " with trailing space) to form option values.
 */
export function normalizeClientModeOfWorkFromAirtable(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) {
    return null;
  }
  const trimmed = raw.trim();
  const match = CLIENT_MODE_OF_WORK_OPTIONS.find(
    (option) =>
      option.value === raw ||
      option.value.trim() === trimmed ||
      option.label.trim() === trimmed,
  );
  return match?.value ?? raw;
}

/**
 * Map form values to exact Airtable single-select names. Returns null when unset
 * or when the value cannot be matched (avoids INVALID_MULTIPLE_CHOICE_OPTIONS).
 */
export function clientModeOfWorkToAirtable(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) {
    return null;
  }
  const trimmed = value.trim();
  const match = CLIENT_MODE_OF_WORK_OPTIONS.find(
    (option) =>
      option.value === value ||
      option.value.trim() === trimmed ||
      option.label.trim() === trimmed,
  );
  return match?.value ?? null;
}
