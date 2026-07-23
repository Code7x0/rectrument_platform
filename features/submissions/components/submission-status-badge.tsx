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
}

export function SubmissionStatusBadge({ status }: SubmissionStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {SUBMISSION_STATUS_LABELS[status]}
    </Badge>
  );
}
