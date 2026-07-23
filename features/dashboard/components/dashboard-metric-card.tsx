import Link from "next/link";

import { cn } from "@/lib/utils";

interface DashboardMetricCardProps {
  label: string;
  value: string | number;
  href: string;
  hint?: string;
  tone?: "default" | "attention" | "positive" | "muted";
  className?: string;
}

const TONE_STYLES = {
  default: "hover:border-[#CBD5E1]",
  attention: "border-[#FECACA] bg-[#FEF2F2] hover:border-[#F87171]",
  positive: "border-[#BBF7D0] bg-[#F0FDF4] hover:border-[#4ADE80]",
  muted: "bg-[#F8FAFC] hover:border-[#CBD5E1]",
} as const;

/**
 * Clickable operations metric — always navigates to a useful module.
 */
export function DashboardMetricCard({
  label,
  value,
  href,
  hint,
  tone = "default",
  className,
}: DashboardMetricCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition duration-200",
        "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2",
        TONE_STYLES[tone],
        className,
      )}
      aria-label={`${label}: ${value}. Open ${label}`}
    >
      <p className="text-xs font-medium tracking-wide text-[#94A3B8] uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0F172A] transition group-hover:text-[#020617]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[#64748B]">{hint}</p>
      ) : (
        <p className="mt-1 text-xs text-[#94A3B8] opacity-0 transition group-hover:opacity-100">
          View details →
        </p>
      )}
    </Link>
  );
}
