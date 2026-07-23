import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ContentContainerProps {
  children: ReactNode;
  className?: string;
}

export function ContentContainer({
  children,
  className,
}: ContentContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl space-y-6", className)}>
      {children}
    </div>
  );
}
