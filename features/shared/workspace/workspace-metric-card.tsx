import Link from "next/link";

import { cn } from "@/lib/utils";

interface WorkspaceMetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  className?: string;
}

export function WorkspaceMetricCard({
  label,
  value,
  hint,
  href,
  className,
}: WorkspaceMetricCardProps) {
  const body = (
    <>
      <p className="text-xs uppercase tracking-wide text-[#94A3B8]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#0F172A]">{value}</p>
      {hint ? <p className="text-xs text-[#94A3B8]">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "rounded-2xl border border-[#E2E8F0] bg-white p-4 transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC]",
          className,
        )}
      >
        {body}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E2E8F0] bg-white p-4",
        className,
      )}
    >
      {body}
    </div>
  );
}
