import { Badge } from "@/components/ui/badge";
import {
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatus,
} from "@/features/shared/entities";

const STATUS_VARIANT: Record<
  SubmissionStatus,
  "default" | "secondary" | "outline" | "success" | "warning"
> = {
  submitted: "default",
  internal_review: "warning",
  client_review: "warning",
  interview: "default",
  offer: "success",
  joined: "success",
  rejected: "secondary",
};

interface SubmissionStatusBadgeProps {
  status: SubmissionStatus;
  /**
   * Exact Airtable Submission Status (Hold, Candidate Backed Out, …).
   * When present this is always what the badge shows — domain buckets like
   * internal_review must never replace it with "Internal Review".
   */
  airtableStatus?: string | null;
  /** Optional override; same priority as airtableStatus when provided. */
  label?: string | null;
}

/**
 * Always prefer the live Airtable status string.
 * Domain `status` is only used for badge color, never for the visible label
 * when an Airtable value exists (Hold must stay Hold, not Internal Review).
 */
export function SubmissionStatusBadge({
  status,
  airtableStatus,
  label,
}: SubmissionStatusBadgeProps) {
  const exact = (label ?? airtableStatus)?.trim() || "";
  const display = exact || SUBMISSION_STATUS_LABELS[status];

  return <Badge variant={STATUS_VARIANT[status]}>{display}</Badge>;
}
