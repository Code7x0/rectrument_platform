import { Badge } from "@/components/ui/badge";
import {
  SUBMISSION_STATUS_LABELS,
  submissionStatusDisplayLabel,
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
  /** Exact Airtable Submission Status when available (Hold, Candidate Backed Out, …). */
  airtableStatus?: string | null;
  label?: string | null;
}

export function SubmissionStatusBadge({
  status,
  airtableStatus,
  label,
}: SubmissionStatusBadgeProps) {
  const display =
    label?.trim() ||
    submissionStatusDisplayLabel({ status, airtableStatus: airtableStatus ?? null }) ||
    SUBMISSION_STATUS_LABELS[status];

  return <Badge variant={STATUS_VARIANT[status]}>{display}</Badge>;
}
