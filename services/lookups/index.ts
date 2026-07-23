import { cache } from "react";

import { listAccountManagerOptions as fetchAccountManagers } from "./accountManagers.lookup";
import { listClientOptions as fetchClients } from "./clients.lookup";
import { listPartnerOptions as fetchPartners } from "./partners.lookup";

/**
 * Request-scoped cached lookups (React cache).
 * Prevents duplicate Airtable calls within a single RSC render.
 * Also safe to wrap with React Query on the client later.
 */
export const listClientOptions = cache(fetchClients);
export const listPartnerOptions = cache(fetchPartners);
export const listAccountManagerOptions = cache(fetchAccountManagers);

export type { LookupOption, LookupOptionsResult } from "./types";
export type { PartnerLookupMode } from "./partners.lookup";
export type { ClientLookupOption } from "./clients.lookup";

export const lookupQueryKeys = {
  clients: ["lookups", "clients"] as const,
  partners: ["lookups", "partners"] as const,
  accountManagers: ["lookups", "accountManagers"] as const,
};
