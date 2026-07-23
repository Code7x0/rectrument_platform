"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { AppSession } from "@/types";

interface AuthMeResponse {
  success: boolean;
  data?: AppSession;
  message?: string;
}

/**
 * Client-side session fetch. Prefer useCurrentUser() when provider is hydrated.
 */
export function useAppSessionQuery(enabled = true) {
  return useQuery({
    queryKey: ["auth", "me"],
    enabled,
    queryFn: async () => {
      const response = await apiClient.get<AuthMeResponse>("/auth/me");
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message ?? "Unable to load session");
      }
      return response.data.data;
    },
  });
}
