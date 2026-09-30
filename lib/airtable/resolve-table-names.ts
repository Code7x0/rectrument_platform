import { getOptionalEnv } from "@/lib/api/env";

/** Unquoted env values often truncate at the first space ("Account Managers" → "Account"). */
export function resolveAccountManagersTableName(
  configured?: string | null,
): string {
  const raw = (configured ?? getOptionalEnv("AIRTABLE_ACCOUNT_MANAGERS_TABLE"))
    ?.trim();
  if (!raw || raw === "Account") {
    return "Account Managers";
  }
  return raw;
}

export function resolvePartnerQueriesTableName(
  configured?: string | null,
): string {
  const raw = (configured ?? getOptionalEnv("AIRTABLE_PARTNER_QUERIES_TABLE"))
    ?.trim();
  const lower = raw?.toLowerCase() ?? "";
  if (!raw || lower === "partner" || lower === "partners") {
    return "Partner Queries";
  }
  return raw;
}
