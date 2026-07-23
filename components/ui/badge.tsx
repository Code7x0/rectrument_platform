import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        variant === "default" &&
          "border-transparent bg-[#2563EB] text-white",
        variant === "secondary" &&
          "border-transparent bg-[#EEF2FF] text-[#2563EB]",
        variant === "outline" && "border-[#E2E8F0] text-[#0F172A]",
        variant === "success" &&
          "border-transparent bg-[#22C55E]/15 text-[#15803D]",
        variant === "warning" &&
          "border-transparent bg-[#F59E0B]/15 text-[#B45309]",
        className,
      )}
      {...props}
    />
  );
}
