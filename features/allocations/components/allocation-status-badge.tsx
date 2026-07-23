import { Badge } from "@/components/ui/badge";
import {
  ALLOCATION_STATUS_LABELS,
  type AllocationStatus,
} from "@/features/allocations/types";

const STATUS_VARIANT: Record<
  AllocationStatus,
  "default" | "secondary" | "outline" | "success" | "warning"
> = {
  assigned: "default",
  working: "warning",
  completed: "success",
  cancelled: "outline",
  archived: "secondary",
};

interface AllocationStatusBadgeProps {
  status: AllocationStatus;
}

export function AllocationStatusBadge({ status }: AllocationStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {ALLOCATION_STATUS_LABELS[status]}
    </Badge>
  );
}
