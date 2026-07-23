"use client";

import { Badge } from "@/components/ui/badge";
import {
  DOCUMENT_VERIFICATION_LABELS,
  type DocumentVerificationStatus,
} from "@/features/partner-documents/types";

const VARIANT: Record<
  DocumentVerificationStatus,
  "default" | "secondary" | "outline" | "success" | "warning"
> = {
  pending: "warning",
  verified: "success",
  rejected: "secondary",
};

export function DocumentVerificationBadge({
  status,
}: {
  status: DocumentVerificationStatus;
}) {
  return (
    <Badge variant={VARIANT[status]}>
      {DOCUMENT_VERIFICATION_LABELS[status]}
    </Badge>
  );
}
