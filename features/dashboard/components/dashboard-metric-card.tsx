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
  default: "hover:border-border hover:shadow-md",
  attention: "border-destructive/30 bg-destructive/5 hover:border-destructive/50",
  positive: "border-success/30 bg-success/5 hover:border-success/50",
  muted: "bg-muted/60 hover:border-border",
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
        "group block rounded-xl border border-border bg-card p-4 shadow-xs transition-ui",
        "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "motion-safe:hover:-translate-y-0.5",
        TONE_STYLES[tone],
        className,
      )}
      aria-label={`${label}: ${value}. Open ${label}`}
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground transition group-hover:text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">
          View details →
        </p>
      )}
    </Link>
  );
}
