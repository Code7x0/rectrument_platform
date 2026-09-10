import { Badge } from "@/components/ui/badge";
import {
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatus,
} from "@/features/shared/entities";
import { cn } from "@/lib/utils";

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

const TABLE_STATUS_SHORT_LABELS: Record<string, string> = {
  "Internal Screening in Progress": "Internal Screening",
  "Being Submitted to Client": "With Client",
  "Being Submitted to Client ": "With Client",
  "Submitted to Client": "With Client",
};

function compactStatusLabel(label: string): string {
  const trimmed = label.trim();
  return TABLE_STATUS_SHORT_LABELS[trimmed] ?? trimmed;
}

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
  /** Dense single-line badge for data tables. */
  density?: "default" | "compact";
}

/**
 * Badge text = exact Airtable / dropdown value.
 * Hold stays Hold. Internal Duplicate stays Internal Duplicate.
 */
export function SubmissionStatusBadge({
  status,
  airtableStatus,
  label,
  density = "default",
}: SubmissionStatusBadgeProps) {
  const exact = (label ?? airtableStatus)?.trim() || "";
  const fullDisplay = exact || SUBMISSION_STATUS_LABELS[status] || "—";
  const display =
    density === "compact" ? compactStatusLabel(fullDisplay) : fullDisplay;

  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      title={fullDisplay}
      className={cn(
        density === "compact" &&
          "inline-flex min-h-[1.625rem] items-center justify-center rounded-md px-2.5 py-1 text-[11px] leading-none font-semibold tracking-normal whitespace-nowrap",
      )}
    >
      {display}
    </Badge>
  );
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
