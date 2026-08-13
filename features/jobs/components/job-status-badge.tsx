import { Badge } from "@/components/ui/badge";
import {
  JOB_STATUS_LABELS,
  type JobStatus,
} from "@/features/jobs/types";

const STATUS_VARIANT: Record<
  JobStatus,
  "default" | "secondary" | "outline" | "success" | "warning"
> = {
  open: "success",
  cancelled: "outline",
  hold_by_us: "warning",
  hold_by_client: "warning",
  closed_by_us: "outline",
  closed_alternatively: "outline",
  on_hold: "warning",
  closed: "outline",
  filled: "default",
  archived: "secondary",
};

interface JobStatusBadgeProps {
  status: JobStatus;
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>{JOB_STATUS_LABELS[status]}</Badge>
  );
}
