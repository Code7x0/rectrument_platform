import {
  JOB_PRIORITY_LABELS,
  JOB_STATUS_LABELS,
} from "@/features/shared/entities/job.entity";
import type { FieldChangeRow } from "@/lib/email/change-table";
import type { Job } from "@/features/jobs/types";

const EMAIL_VALUE_MAX = 2000;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\r\n/g, "\n").trim();
}

/** Partner-facing job body (Comments / description text, markers already stripped). */
export function jobPartnerDetailsText(job: Job | null | undefined): string {
  if (!job) {
    return "";
  }
  return normalizeText(job.description) || normalizeText(job.notes);
}

function truncateForEmail(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= EMAIL_VALUE_MAX) {
    return trimmed;
  }
  return `${trimmed.slice(0, EMAIL_VALUE_MAX - 1)}…`;
}

/**
 * Rows for partner job-update emails — compare persisted job before vs after update
 * so Present Value reflects what is actually stored (e.g. Comments / Details).
 */
export function buildJobPartnerUpdateChanges(
  before: Job | null,
  after: Job,
): FieldChangeRow[] {
  const changes: FieldChangeRow[] = [];

  const prevDetails = jobPartnerDetailsText(before);
  const nextDetails = jobPartnerDetailsText(after);
  if (prevDetails !== nextDetails) {
    changes.push({
      field: "Details",
      value: nextDetails ? truncateForEmail(nextDetails) : "—",
    });
  }

  if (before?.title !== after.title) {
    changes.push({ field: "Title", value: after.title });
  }
  if (before?.status !== after.status) {
    changes.push({
      field: "Status",
      value: JOB_STATUS_LABELS[after.status] ?? after.status,
    });
  }
  if (before?.priority !== after.priority && after.priority) {
    changes.push({
      field: "Priority",
      value: JOB_PRIORITY_LABELS[after.priority] ?? after.priority,
    });
  }
  if (normalizeText(before?.location) !== normalizeText(after.location)) {
    changes.push({
      field: "Location",
      value: normalizeText(after.location) || "—",
    });
  }
  if (normalizeText(before?.salary) !== normalizeText(after.salary)) {
    changes.push({
      field: "Salary",
      value: normalizeText(after.salary) || "—",
    });
  }
  if (normalizeText(before?.experience) !== normalizeText(after.experience)) {
    changes.push({
      field: "Experience",
      value: normalizeText(after.experience) || "—",
    });
  }
  if (
    normalizeText(before?.hiringManager) !== normalizeText(after.hiringManager)
  ) {
    changes.push({
      field: "Hiring Manager",
      value: normalizeText(after.hiringManager) || "—",
    });
  }
  if (normalizeText(before?.workMode) !== normalizeText(after.workMode)) {
    changes.push({
      field: "Work Mode",
      value: normalizeText(after.workMode) || "—",
    });
  }
  if (
    normalizeText(before?.interviewProcess) !==
    normalizeText(after.interviewProcess)
  ) {
    changes.push({
      field: "Interview Process",
      value: normalizeText(after.interviewProcess) || "—",
    });
  }

  return changes;
}
