import { AIRTABLE_ENV_KEYS } from "@/lib/constants";
import { getOptionalEnv, getRequiredEnv } from "@/lib/api/env";

export function getAirtableTableName(
  key: keyof typeof AIRTABLE_ENV_KEYS,
): string {
  return getRequiredEnv(AIRTABLE_ENV_KEYS[key]);
}

/**
 * Returns null when the env var is unset/blank.
 * Use for modules that have no storage on the client CRM base
 * (documents, payouts, activities, notifications, settings).
 */
export function getOptionalAirtableTableName(
  key: keyof typeof AIRTABLE_ENV_KEYS,
): string | null {
  const value = getOptionalEnv(AIRTABLE_ENV_KEYS[key])?.trim();
  return value ? value : null;
}

export function isOptionalTableConfigured(
  key: keyof typeof AIRTABLE_ENV_KEYS,
): boolean {
  return getOptionalAirtableTableName(key) !== null;
}
