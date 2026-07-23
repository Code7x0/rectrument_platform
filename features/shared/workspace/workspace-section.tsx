import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface WorkspaceSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function WorkspaceSection({
  title,
  children,
  className,
}: WorkspaceSectionProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E2E8F0] bg-white p-5",
        className,
      )}
    >
      {title ? (
        <h2 className="text-sm font-semibold text-[#0F172A]">{title}</h2>
      ) : null}
      <div className={title ? "mt-4" : undefined}>{children}</div>
    </div>
  );
}
