import { cache } from "react";

import {
  getCachedAccountManagerLookupOptions,
  getCachedClientLookupOptions,
  getCachedPartnerLookupOptions,
} from "@/lib/cache/crm-cache";

import type { PartnerLookupMode } from "./partners.lookup";

/**
 * Request-scoped + cross-request cached lookups.
 * Prevents duplicate Airtable calls within a single RSC render and across
 * short-lived requests (90s TTL with tag invalidation on mutations).
 */
export const listClientOptions = cache(async () =>
  getCachedClientLookupOptions(),
);
export const listPartnerOptions = cache(
  async (mode: PartnerLookupMode = "identity") =>
    getCachedPartnerLookupOptions(mode),
);
export const listAccountManagerOptions = cache(async () =>
  getCachedAccountManagerLookupOptions(),
);

export type { LookupOption, LookupOptionsResult } from "./types";
export type { PartnerLookupMode } from "./partners.lookup";
export type { ClientLookupOption } from "./clients.lookup";

export const lookupQueryKeys = {
  clients: ["lookups", "clients"] as const,
  partners: ["lookups", "partners"] as const,
  accountManagers: ["lookups", "accountManagers"] as const,
};
