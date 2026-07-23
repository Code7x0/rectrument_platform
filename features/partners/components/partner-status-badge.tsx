import { Badge } from "@/components/ui/badge";
import {
  PARTNER_STATUS_LABELS,
  PARTNER_VERIFICATION_LABELS,
  type PartnerStatus,
  type PartnerVerificationStatus,
} from "@/features/partners/types";

const STATUS_VARIANT: Record<
  PartnerStatus,
  "default" | "secondary" | "outline" | "success" | "warning"
> = {
  active: "success",
  inactive: "warning",
  pending: "default",
  archived: "secondary",
};

const VERIFICATION_VARIANT: Record<
  PartnerVerificationStatus,
  "default" | "secondary" | "outline" | "success" | "warning"
> = {
  pending: "warning",
  verified: "success",
  rejected: "secondary",
};

export function PartnerStatusBadge({ status }: { status: PartnerStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {PARTNER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PartnerVerificationBadge({
  status,
}: {
  status: PartnerVerificationStatus;
}) {
  return (
    <Badge variant={VERIFICATION_VARIANT[status]}>
      {PARTNER_VERIFICATION_LABELS[status]}
    </Badge>
  );
}
