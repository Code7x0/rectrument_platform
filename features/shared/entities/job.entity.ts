/**
 * Canonical Job entity — independent of Airtable field names.
 * Feature modules may re-export or extend for list filters / form DTOs.
 */

/**
 * Job Status mirrors live Airtable Jobs.Status choices.
 * Legacy keys (`on_hold`, `closed`, `filled`, `archived`) remain for soft-delete
 * / older code paths and always write a valid live Airtable choice.
 */
export type JobStatus =
  | "open"
  | "cancelled"
  | "hold_by_us"
  | "hold_by_client"
  | "closed_by_us"
  | "closed_alternatively"
  /** @deprecated Prefer hold_by_us — retained for older callers. */
  | "on_hold"
  /** @deprecated Prefer closed_by_us. */
  | "closed"
  | "filled"
  | "archived";

export type JobPriority = "low" | "medium" | "high" | "urgent";

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship";

export interface JobEntity {
  id: string;
  jobCode: string;
  title: string;
  clientId: string | null;
  clientName: string | null;
  /** Business Client ID (BCE, AB…) — enriched. */
  clientCode: string | null;
  /** Primary operational owner (first of accountManagerIds). */
  accountManagerId: string | null;
  /** All Account Managers tagged on this job. */
  accountManagerIds: string[];
  accountManagerName: string | null;
  /**
   * Explicit per-job unassign ([RP_AM] none). When true, do not inherit
   * Clients.Account Owner for display or AM dashboard visibility.
   */
  accountManagerUnassigned: boolean;
  hiringManager: string | null;
  description: string | null;
  /** Airtable attachment files from Job Description / Sample Profiling / Skill Matrix. */
  documents: JobDocument[];
  location: string | null;
  /** Airtable Jobs.Work Mode when present (WFO / WFH / hybrid text). */
  workMode: string | null;
  employmentType: EmploymentType | null;
  experience: string | null;
  salary: string | null;
  /** Airtable Jobs.Payout (percent or text) — Possible Payout for partners. */
  possiblePayout: string | null;
  priority: JobPriority | null;
  /**
   * App-schema only. Locked client Jobs has no Open Positions — null there.
   */
  openPositions: number | null;
  skills: string[];
  status: JobStatus;
  notes: string | null;
  department: string | null;
  /** Locked-base Interview Process field (closest analogue to requirements). */
  interviewProcess: string | null;
  seniorityLevel: string | null;
  createdById: string | null;
  createdAt: string | null;
  /** Jobs.Start Date — closest “job open / last activated” date on locked base. */
  startDate: string | null;
  /** Jobs.Posted Date (same Airtable column as createdAt chronology). */
  postedDate: string | null;
}

export interface JobDocument {
  label: string;
  url: string;
  filename: string;
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  open: "Active",
  cancelled: "Inactive",
  hold_by_us: "Hold by us",
  hold_by_client: "Hold by Client",
  closed_by_us: "Closed by us",
  closed_alternatively: "Closed Alternatively",
  on_hold: "Hold by us",
  closed: "Closed by us",
  filled: "Closed by us",
  archived: "Closed by us",
};

/** Statuses Partners can still work (Assigned Jobs queue). */
export function isAssignableJobStatus(status: JobStatus): boolean {
  return (
    status === "open" ||
    status === "hold_by_us" ||
    status === "hold_by_client" ||
    status === "on_hold"
  );
}

/** Statuses Partners may claim from Available Jobs. */
export function isClaimableJobStatus(status: JobStatus): boolean {
  return status === "open";
}

export function isClosedJobStatus(status: JobStatus): boolean {
  return (
    status === "closed_by_us" ||
    status === "closed_alternatively" ||
    status === "closed" ||
    status === "filled" ||
    status === "archived"
  );
}

export const JOB_PRIORITY_LABELS: Record<JobPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  /** Domain `urgent` displays as live Airtable "Super High". */
  urgent: "Super High",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};
