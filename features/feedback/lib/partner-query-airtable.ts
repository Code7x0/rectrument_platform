import { isClientCompatMode } from "@/lib/airtable/compat";
import { DOMAIN_PARTNER_QUERY_TYPE_TO_AIRTABLE } from "@/lib/airtable/fields";
import { resolvePartnerQueriesTableName as resolvePartnerQueriesTableNameCore } from "@/lib/airtable/resolve-table-names";
import type { PartnerQueryType } from "@/features/feedback/types";

/**
 * Live client bases use legacy Partner Queries "Query Type" options
 * (Account question / Feedback / Suggestion) — not the app-schema labels.
 */
const CLIENT_PARTNER_QUERY_TYPE_TO_AIRTABLE: Record<
  PartnerQueryType,
  string
> = {
  platform_feedback: "Feedback",
  job_candidate_query: "Account question",
  account_admin_query: "Account question",
};

export function partnerQueryTypeToAirtableWrite(type: PartnerQueryType): string {
  if (isClientCompatMode()) {
    return CLIENT_PARTNER_QUERY_TYPE_TO_AIRTABLE[type];
  }
  return DOMAIN_PARTNER_QUERY_TYPE_TO_AIRTABLE[type];
}

/** Avoid truncated env values like `Partner` (from unquoted "Partner Queries"). */
export function resolvePartnerQueriesTableName(
  configured?: string | null,
): string {
  return resolvePartnerQueriesTableNameCore(configured);
}
