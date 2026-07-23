import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div>
        <h2 className="text-lg font-semibold text-[#0F172A]">{title}</h2>
        {description ? (
          <p className="text-sm text-[#64748B]">{description}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
