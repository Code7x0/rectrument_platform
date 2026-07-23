"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface WorkspaceHeaderProps {
  title: string;
  subtitle?: string | null;
  actions?: ReactNode;
  className?: string;
}

export function WorkspaceHeader({
  title,
  subtitle,
  actions,
  className,
}: WorkspaceHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className,
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
