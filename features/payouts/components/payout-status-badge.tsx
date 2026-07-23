"use client";

import { Badge } from "@/components/ui/badge";
import {
  PAYOUT_STATUS_LABELS,
  type PayoutStatus,
} from "@/features/payouts/types";

const VARIANT: Record<
  PayoutStatus,
  "default" | "secondary" | "outline" | "success" | "warning"
> = {
  not_eligible: "secondary",
  eligible: "warning",
  processing: "default",
  paid: "success",
  completed: "success",
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return (
    <Badge variant={VARIANT[status]}>{PAYOUT_STATUS_LABELS[status]}</Badge>
  );
}
