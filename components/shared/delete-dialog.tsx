"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  entityLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Hard-delete confirmation. Prefer ArchiveDialog for soft deletes.
 */
export function DeleteDialog({
  open,
  onOpenChange,
  entityName,
  entityLabel = "record",
  loading = false,
  onConfirm,
}: DeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${entityLabel}?`}
      description={
        <>
          This will permanently delete{" "}
          <span className="font-medium text-[#0F172A]">{entityName}</span>. This
          action cannot be undone.
        </>
      }
      confirmLabel="Delete"
      variant="destructive"
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}
