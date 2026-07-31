"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /**
   * scroll (default) — whole body scrolls (most forms).
   * split — body is a flex column with no outer scroll so forms can pin footers.
   */
  bodyLayout?: "scroll" | "split";
}

/**
 * Shared form dialog chrome. Features pass form body as children.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  bodyLayout = "scroll",
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0",
          className,
        )}
      >
        <DialogHeader className="shrink-0 space-y-1.5 border-b border-border px-6 py-5 pr-12">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div
          className={cn(
            "min-h-0 flex-1",
            bodyLayout === "split"
              ? "flex flex-col overflow-hidden"
              : "overflow-y-auto px-6 py-5",
          )}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
