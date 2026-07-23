"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface ArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  entityLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Soft-archive confirmation. Prefer archive over hard delete.
 */
export function ArchiveDialog({
  open,
  onOpenChange,
  entityName,
  entityLabel = "record",
  loading = false,
  onConfirm,
}: ArchiveDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Archive ${entityLabel}?`}
      description={
        <>
          This will soft-archive{" "}
          <span className="font-medium text-[#0F172A]">{entityName}</span>. It
          will no longer appear in active lists.
        </>
      }
      confirmLabel="Archive"
      variant="destructive"
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}
