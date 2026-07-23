/**
 * Jobs feature types — re-export canonical Job entity + feature DTOs.
 */

export type {
  EmploymentType,
  JobEntity as Job,
  JobPriority,
  JobStatus,
} from "@/features/shared/entities";
export {
  EMPLOYMENT_TYPE_LABELS,
  JOB_PRIORITY_LABELS,
  JOB_STATUS_LABELS,
} from "@/features/shared/entities";

import type {
  EmploymentType,
  JobPriority,
  JobStatus,
} from "@/features/shared/entities";

export interface JobListFilters {
  search?: string;
  status?: JobStatus | "all";
  clientId?: string | "all";
  accountManagerId?: string | "all";
  priority?: JobPriority | "all";
  location?: string | "all";
  employmentType?: EmploymentType | "all";
  includeArchived?: boolean;
}

export interface CreateJobInput {
  title: string;
  clientId: string;
  accountManagerId: string;
  hiringManager?: string;
  description?: string;
  location?: string;
  employmentType?: EmploymentType;
  experience?: string;
  salary?: string;
  priority?: JobPriority;
  openPositions?: number;
  skills?: string[];
  status?: JobStatus;
  notes?: string;
  department?: string;
  createdById?: string;
}

export type UpdateJobInput = Partial<CreateJobInput>;
