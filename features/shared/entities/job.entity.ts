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
  /** Operational owner — every job has exactly one Account Manager. */
  accountManagerId: string | null;
  accountManagerName: string | null;
  hiringManager: string | null;
  description: string | null;
  location: string | null;
  employmentType: EmploymentType | null;
  experience: string | null;
  salary: string | null;
  priority: JobPriority | null;
  openPositions: number;
  skills: string[];
  status: JobStatus;
  notes: string | null;
  department: string | null;
  createdById: string | null;
  createdAt: string | null;
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
