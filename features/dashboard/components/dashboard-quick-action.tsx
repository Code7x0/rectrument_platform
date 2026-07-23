import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Briefcase,
  ClipboardCheck,
  FileText,
  Plus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { DashboardQuickActionItem } from "@/features/dashboard/types";

const ICON_MAP: Record<string, LucideIcon> = {
  invite: UserPlus,
  review: ClipboardCheck,
  roles: Users,
  client: Plus,
  job: Briefcase,
  documents: FileText,
  partners: Users,
  earnings: Wallet,
  default: ArrowUpRight,
};

interface DashboardQuickActionProps {
  item: DashboardQuickActionItem;
  iconKey?: keyof typeof ICON_MAP;
  className?: string;
}

export function DashboardQuickAction({
  item,
  iconKey = "default",
  className,
}: DashboardQuickActionProps) {
  const Icon = ICON_MAP[iconKey] ?? ArrowUpRight;

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 transition duration-200",
        "hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2",
        className,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#0F172A] transition group-hover:bg-[#0F172A] group-hover:text-white">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#0F172A]">
          {item.label}
        </span>
        {item.description ? (
          <span className="mt-0.5 block text-xs text-[#64748B]">
            {item.description}
          </span>
        ) : null}
      </span>
      <ArrowUpRight
        className="ml-auto h-4 w-4 shrink-0 text-[#94A3B8] transition group-hover:text-[#0F172A]"
        aria-hidden
      />
    </Link>
  );
}

interface DashboardQuickActionGridProps {
  items: Array<DashboardQuickActionItem & { iconKey?: keyof typeof ICON_MAP }>;
  className?: string;
}

export function DashboardQuickActionGrid({
  items,
  className,
}: DashboardQuickActionGridProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <DashboardQuickAction
          key={item.id}
          item={item}
          iconKey={item.iconKey}
        />
      ))}
    </div>
  );
}
