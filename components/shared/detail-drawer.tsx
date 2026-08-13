"use client";

import type { ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface DetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
  className?: string;
  /** Pinned action row under the title (e.g. Submit Candidate at top). */
  stickyHeader?: ReactNode;
  /** Pinned action row (e.g. Submit Candidate) — always visible without scrolling. */
  stickyFooter?: ReactNode;
}

/**
 * Shared detail drawer (sheet). Modules render domain content as children.
 */
export function DetailDrawer({
  open,
  onOpenChange,
  title,
  children,
  side = "right",
  className,
  stickyHeader,
  stickyFooter,
}: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "flex w-full flex-col overflow-hidden p-0 sm:max-w-lg",
          className,
        )}
      >
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {stickyHeader ? (
          <div className="drawer-chrome shrink-0 border-b border-border bg-card px-6 py-3 supports-[backdrop-filter]:bg-card/90 supports-[backdrop-filter]:backdrop-blur-sm">
            {stickyHeader}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {stickyFooter ? (
          <div className="drawer-chrome shrink-0 border-t border-border bg-card px-6 py-4 supports-[backdrop-filter]:bg-card/90 supports-[backdrop-filter]:backdrop-blur-sm">
            {stickyFooter}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
