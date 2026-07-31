import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Elevated card with soft shadow (default). */
  elevated?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClass = {
  none: "",
  sm: "p-3",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
} as const;

/**
 * Shared surface for dashboards, tables wrappers, and detail sections.
 */
export function Panel({
  children,
  className,
  elevated = true,
  padding = "none",
  ...props
}: PanelProps) {
  return (
    <div
      className={cn(
        elevated ? "surface-card" : "surface-panel",
        paddingClass[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
