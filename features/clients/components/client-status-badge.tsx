import { Badge } from "@/components/ui/badge";
import {
  CLIENT_STATUS_LABELS,
  type ClientStatus,
} from "@/features/clients/types";

const VARIANT: Record<
  ClientStatus,
  "default" | "secondary" | "outline" | "success" | "warning"
> = {
  active: "success",
  inactive: "warning",
  archived: "secondary",
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return <Badge variant={VARIANT[status]}>{CLIENT_STATUS_LABELS[status]}</Badge>;
}
