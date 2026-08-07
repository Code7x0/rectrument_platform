/**
 * Canonical Job entity — independent of Airtable field names.
 * Feature modules may re-export or extend for list filters / form DTOs.
 */

export type JobStatus =
  | "open"
  | "on_hold"
  | "closed"
  | "cancelled"
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
  priority: JobPriority | null;
  openPositions: number;
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
  open: "Open",
  on_hold: "On Hold",
  closed: "Closed",
  cancelled: "Cancelled",
  filled: "Filled",
  archived: "Archived",
};

export const JOB_PRIORITY_LABELS: Record<JobPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};
