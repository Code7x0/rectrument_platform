"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Example React Query hook scaffold.
 * Replace with domain-specific hooks when building features.
 */
export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await fetch("/api/health");
      if (!response.ok) {
        throw new Error("Health check failed");
      }
      return response.json() as Promise<{ status: string }>;
    },
    enabled: false,
  });
}
