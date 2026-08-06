import { Badge } from "@/components/ui/badge";
import {
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatus,
} from "@/features/shared/entities";

/**
 * Color only — never used as the visible label when an Airtable value exists.
 */
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
  /** Domain bucket — color only when Airtable label is present. */
  status: SubmissionStatus;
  /**
   * Exact Airtable Submission Status (Hold, Internal Duplicate, …).
   * When set, this is always the badge text — never "Internal Review" / "Rejected".
   */
  airtableStatus?: string | null;
  /** Same as airtableStatus when callers already resolved the label. */
  label?: string | null;
}

/**
 * Badge text = exact Airtable / dropdown value.
 * Hold stays Hold. Internal Duplicate stays Internal Duplicate.
 */
export function SubmissionStatusBadge({
  status,
  airtableStatus,
  label,
}: SubmissionStatusBadgeProps) {
  const exact = (label ?? airtableStatus)?.trim() || "";
  const display = exact || SUBMISSION_STATUS_LABELS[status] || "—";

  return <Badge variant={STATUS_VARIANT[status]}>{display}</Badge>;
}

/** Independent interview-stage chip — not mixed with Submission Status. */
export function InterviewStageBadge({
  stage,
}: {
  stage: string | null | undefined;
}) {
  const text = stage?.trim();
  if (!text) {
    return null;
  }
  return <Badge variant="outline">{text}</Badge>;
}
