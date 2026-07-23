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
  on_hold: "warning",
  closed: "outline",
  cancelled: "outline",
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
