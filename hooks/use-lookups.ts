"use client";

import { useQuery } from "@tanstack/react-query";

import {
  listAccountManagerOptions,
  listClientOptions,
  listPartnerOptions,
  lookupQueryKeys,
  type LookupOption,
} from "@/services/lookups";

/**
 * React Query-ready lookup hooks.
 * Prefer server-fetched props in RSC pages; use these for client-only views.
 */

async function fetchViaApi(path: string): Promise<LookupOption[]> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("Failed to load lookup options");
  }
  const json = (await response.json()) as {
    success: boolean;
    data: LookupOption[];
  };
  if (!json.success) {
    throw new Error("Lookup request failed");
  }
  return json.data;
}

export function useClientOptions(enabled = true) {
  return useQuery({
    queryKey: lookupQueryKeys.clients,
    enabled,
    queryFn: () => fetchViaApi("/api/lookups/clients"),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePartnerOptions(enabled = true) {
  return useQuery({
    queryKey: lookupQueryKeys.partners,
    enabled,
    queryFn: () => fetchViaApi("/api/lookups/partners"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAccountManagerOptions(enabled = true) {
  return useQuery({
    queryKey: lookupQueryKeys.accountManagers,
    enabled,
    queryFn: () => fetchViaApi("/api/lookups/account-managers"),
    staleTime: 5 * 60 * 1000,
  });
}

/** Server-compatible helpers re-exported for hooks package consumers. */
export const serverLookups = {
  listClientOptions,
  listPartnerOptions,
  listAccountManagerOptions,
};
