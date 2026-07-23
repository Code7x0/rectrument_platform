/**
 * Search module has no dedicated Airtable table.
 * Persistence for recent searches is client localStorage.
 * Entity data is loaded via existing feature services/repositories.
 */

export const SEARCH_DATA_SOURCE = "existing_feature_services" as const;
