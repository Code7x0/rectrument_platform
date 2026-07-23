"use client";

import type { ComponentType } from "react";
import {
  Bell,
  Briefcase,
  CheckCircle2,
  FileText,
  Shield,
  UserRound,
  Wallet,
} from "lucide-react";

import type { ActivityAction, ActivityEntityType } from "@/features/workflows/types";
import { cn } from "@/lib/utils";

const ENTITY_ICONS: Record<
  ActivityEntityType,
  ComponentType<{ className?: string }>
> = {
  submission: UserRound,
  partner_document: FileText,
  payout: Wallet,
  user: Shield,
};

const ACTION_ICONS: Partial<
  Record<ActivityAction, ComponentType<{ className?: string }>>
> = {
  partner_approved: CheckCircle2,
  document_verification: FileText,
  payout_status_change: Wallet,
  role_changed: Shield,
  invitation_sent: Bell,
  invitation_accepted: Bell,
  registration_submitted: UserRound,
};

interface ActivityIconProps {
  entityType: ActivityEntityType;
  action: ActivityAction;
  className?: string;
}

export function ActivityIcon({
  entityType,
  action,
  className,
}: ActivityIconProps) {
  const Icon = ACTION_ICONS[action] ?? ENTITY_ICONS[entityType] ?? Briefcase;

  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]",
        className,
      )}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
