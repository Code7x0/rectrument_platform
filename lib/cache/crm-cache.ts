import { revalidateTag, unstable_cache } from "next/cache";

import { findClients } from "@/features/clients/repositories/clients.repository";
import { findJobs } from "@/features/jobs/repositories/jobs.repository";
import { findPartners } from "@/features/partners/repositories/partners.repository";
import {
  CLIENTS_TABLE_FIELDS,
  JOBS_TABLE_FIELDS,
  PARTNERS_TABLE_FIELDS,
} from "@/lib/airtable/fields";
import { listAccountManagerOptions as fetchAccountManagers } from "@/services/lookups/accountManagers.lookup";
import { listClientOptions as fetchClientOptions } from "@/services/lookups/clients.lookup";
import { listPartnerOptions as fetchPartnerOptions } from "@/services/lookups/partners.lookup";
import type { PartnerLookupMode } from "@/services/lookups/partners.lookup";

/** Shared CRM list TTL — short enough for live ops, long enough to cut repeat scans. */
export const CRM_CACHE_REVALIDATE_SECONDS = 90;

export const CRM_CACHE_TAGS = {
  jobs: "crm:jobs",
  clients: "crm:clients",
  partners: "crm:partners",
  lookupsClients: "crm:lookups:clients",
  lookupsPartnersIdentity: "crm:lookups:partners:identity",
  lookupsPartnersOperational: "crm:lookups:partners:operational",
  lookupsAccountManagers: "crm:lookups:account-managers",
} as const;

export function invalidateCrmCacheTags(
  ...tags: Array<(typeof CRM_CACHE_TAGS)[keyof typeof CRM_CACHE_TAGS]>
): void {
  for (const tag of tags) {
    revalidateTag(tag);
  }
}

export function invalidateCrmAfterJobMutation(): void {
  invalidateCrmCacheTags(CRM_CACHE_TAGS.jobs);
}

export function invalidateCrmAfterClientMutation(): void {
  invalidateCrmCacheTags(
    CRM_CACHE_TAGS.clients,
    CRM_CACHE_TAGS.lookupsClients,
  );
}

export function invalidateCrmAfterPartnerMutation(): void {
  invalidateCrmCacheTags(
    CRM_CACHE_TAGS.partners,
    CRM_CACHE_TAGS.lookupsPartnersIdentity,
    CRM_CACHE_TAGS.lookupsPartnersOperational,
  );
}

export function invalidateCrmAfterAllocationMutation(): void {
  invalidateCrmCacheTags(CRM_CACHE_TAGS.jobs);
}

export function invalidateCrmAfterAccountManagerMutation(): void {
  invalidateCrmCacheTags(CRM_CACHE_TAGS.lookupsAccountManagers);
}

export function invalidateCrmAfterUserMutation(): void {
  invalidateCrmCacheTags(
    CRM_CACHE_TAGS.lookupsPartnersIdentity,
    CRM_CACHE_TAGS.lookupsPartnersOperational,
    CRM_CACHE_TAGS.lookupsAccountManagers,
  );
}

const fetchAllJobsForCache = unstable_cache(
  async () =>
    findJobs({
      sort: [{ field: JOBS_TABLE_FIELDS.createdAt, direction: "desc" }],
    }),
  ["crm-cache-jobs-all"],
  {
    revalidate: CRM_CACHE_REVALIDATE_SECONDS,
    tags: [CRM_CACHE_TAGS.jobs],
  },
);

const fetchAllClientsForCache = unstable_cache(
  async () =>
    findClients({
      sort: [{ field: CLIENTS_TABLE_FIELDS.name, direction: "asc" }],
    }),
  ["crm-cache-clients-all"],
  {
    revalidate: CRM_CACHE_REVALIDATE_SECONDS,
    tags: [CRM_CACHE_TAGS.clients],
  },
);

const fetchAllPartnersForCache = unstable_cache(
  async () =>
    findPartners({
      sort: [
        { field: PARTNERS_TABLE_FIELDS.companyName, direction: "asc" },
      ],
    }),
  ["crm-cache-partners-all"],
  {
    revalidate: CRM_CACHE_REVALIDATE_SECONDS,
    tags: [CRM_CACHE_TAGS.partners],
  },
);

const fetchClientLookupOptions = unstable_cache(
  async () => fetchClientOptions(),
  ["crm-cache-lookup-clients"],
  {
    revalidate: CRM_CACHE_REVALIDATE_SECONDS,
    tags: [CRM_CACHE_TAGS.lookupsClients],
  },
);

const fetchPartnerLookupOptionsIdentity = unstable_cache(
  async () => fetchPartnerOptions("identity"),
  ["crm-cache-lookup-partners-identity"],
  {
    revalidate: CRM_CACHE_REVALIDATE_SECONDS,
    tags: [CRM_CACHE_TAGS.lookupsPartnersIdentity],
  },
);

const fetchPartnerLookupOptionsOperational = unstable_cache(
  async () => fetchPartnerOptions("operational"),
  ["crm-cache-lookup-partners-operational"],
  {
    revalidate: CRM_CACHE_REVALIDATE_SECONDS,
    tags: [CRM_CACHE_TAGS.lookupsPartnersOperational],
  },
);

const fetchAccountManagerLookupOptions = unstable_cache(
  async () => fetchAccountManagers(),
  ["crm-cache-lookup-account-managers"],
  {
    revalidate: CRM_CACHE_REVALIDATE_SECONDS,
    tags: [CRM_CACHE_TAGS.lookupsAccountManagers],
  },
);

export async function getCachedAllJobs() {
  return fetchAllJobsForCache();
}

export async function getCachedAllClients() {
  return fetchAllClientsForCache();
}

export async function getCachedAllPartners() {
  return fetchAllPartnersForCache();
}

export async function getCachedClientLookupOptions() {
  return fetchClientLookupOptions();
}

export async function getCachedPartnerLookupOptions(mode: PartnerLookupMode) {
  return mode === "operational"
    ? fetchPartnerLookupOptionsOperational()
    : fetchPartnerLookupOptionsIdentity();
}

export async function getCachedAccountManagerLookupOptions() {
  return fetchAccountManagerLookupOptions();
}
