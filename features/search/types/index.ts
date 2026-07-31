/**
 * Global Search — permission-aware orchestration over existing modules.
 */

import type { UserRole } from "@/types";

export type SearchEntityType =
  | "client"
  | "job"
  | "account_manager"
  | "partner"
  | "user"
  | "allocation"
  | "candidate"
  | "submission"
  | "document"
  | "payout"
  | "notification"
  | "activity"
  | "settings";

export type SearchFilterChip =
  | "all"
  | "clients"
  | "jobs"
  | "partners"
  | "candidates"
  | "documents"
  | "payouts"
  | "activities"
  | "notifications"
  | "settings";

export type SearchResultGroupId =
  | "clients"
  | "jobs"
  | "partners"
  | "account_managers"
  | "users"
  | "allocations"
  | "candidates"
  | "submissions"
  | "documents"
  | "payouts"
  | "activities"
  | "notifications"
  | "settings";

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string | null;
  entityType: SearchEntityType;
  status: string | null;
  url: string;
  icon: SearchEntityType;
  badge: string | null;
  matchedField: string | null;
  metadata: Record<string, string> | null;
  score: number;
  updatedAt: string | null;
}

export interface SearchResultGroup {
  id: SearchResultGroupId;
  label: string;
  items: SearchResult[];
  total: number;
  hasMore: boolean;
}

export interface GlobalSearchInput {
  query: string;
  filter?: SearchFilterChip;
  /** Modal uses smaller limits than full page. */
  mode?: "modal" | "page";
}

export interface GlobalSearchResponse {
  query: string;
  filter: SearchFilterChip;
  groups: SearchResultGroup[];
  total: number;
  tookMs: number;
}

export const SEARCH_FILTER_CHIPS: Array<{
  id: SearchFilterChip;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "clients", label: "Clients" },
  { id: "jobs", label: "Jobs" },
  { id: "partners", label: "Partners" },
  { id: "candidates", label: "Candidates" },
  { id: "documents", label: "Documents" },
  { id: "payouts", label: "Payouts" },
  { id: "activities", label: "Activities" },
  { id: "notifications", label: "Notifications" },
  { id: "settings", label: "Settings" },
];

/** Chips each role is allowed to use — keeps search UI aligned with RBAC. */
export function searchFilterChipsForRole(
  role: UserRole,
): Array<{ id: SearchFilterChip; label: string }> {
  const allowed = new Set<SearchFilterChip>(["all", "jobs", "candidates", "payouts", "activities", "notifications", "settings"]);

  if (role === "partner") {
    allowed.add("documents");
  } else if (role === "account_manager") {
    allowed.add("clients");
    // AM may search partners already allocated to their jobs (codes only).
    allowed.add("partners");
  } else {
    allowed.add("clients");
    allowed.add("partners");
    allowed.add("documents");
  }

  return SEARCH_FILTER_CHIPS.filter((chip) => allowed.has(chip.id));
}

export function searchPlaceholderForRole(role: UserRole): string {
  switch (role) {
    case "partner":
      return "Search your jobs, candidates, payouts…";
    case "account_manager":
      return "Search your clients, jobs, candidates…";
    default:
      return "Search clients, jobs, partners…";
  }
}

export const SEARCH_GROUP_LABELS: Record<SearchResultGroupId, string> = {
  clients: "Clients",
  jobs: "Jobs",
  partners: "Partners",
  account_managers: "Account Managers",
  users: "Users",
  allocations: "Allocations",
  candidates: "Candidates",
  submissions: "Submissions",
  documents: "Documents",
  payouts: "Payouts",
  activities: "Activities",
  notifications: "Notifications",
  settings: "Settings",
};

export const ENTITY_TO_GROUP: Record<SearchEntityType, SearchResultGroupId> = {
  client: "clients",
  job: "jobs",
  partner: "partners",
  account_manager: "account_managers",
  user: "users",
  allocation: "allocations",
  candidate: "candidates",
  submission: "submissions",
  document: "documents",
  payout: "payouts",
  activity: "activities",
  notification: "notifications",
  settings: "settings",
};

export const RECENT_SEARCHES_STORAGE_KEY = "rpms.search.recent";
export const MAX_RECENT_SEARCHES = 10;
