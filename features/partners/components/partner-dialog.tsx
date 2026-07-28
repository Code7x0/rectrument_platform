"use client";

import { useState } from "react";
import { toast } from "sonner";

import { DeleteDialog } from "@/components/shared/delete-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  createPartnerAction,
  deletePartnerAction,
  updatePartnerAction,
} from "@/features/partners/actions/partners.actions";
import { PartnerForm } from "@/features/partners/components/partner-form";
import type { PartnerFormValues } from "@/features/partners/schemas/partner.schema";
import type { Partner } from "@/features/partners/types";

interface PartnerDialogProps {
  open: boolean;
  mode: "create" | "edit";
  partner?: Partner | null;
  canDelete?: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function PartnerDialog({
  open,
  mode,
  partner,
  canDelete = false,
  onOpenChange,
  onCompleted,
}: PartnerDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(values: PartnerFormValues) {
    setSubmitting(true);
    try {
      const result =
        mode === "create"
          ? await createPartnerAction(values)
          : await updatePartnerAction(partner!.id, values);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(mode === "create" ? "Partner created" : "Partner updated");
      onOpenChange(false);
      onCompleted();
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!partner) {
      return;
    }
    setDeleting(true);
    try {
      const result = await deletePartnerAction(partner.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Talent Partner deleted from Airtable");
      setDeleteOpen(false);
      onOpenChange(false);
      onCompleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={mode === "create" ? "Create Partner" : "Edit Partner"}
        description={
          mode === "create"
            ? "Add a talent partner to the platform."
            : "Update partner details."
        }
      >
        <PartnerForm
          key={partner?.id ?? "create"}
          initialPartner={mode === "edit" ? partner : null}
          submitting={submitting || deleting}
          submitLabel={mode === "create" ? "Create Partner" : "Save Changes"}
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
          onDelete={
            mode === "edit" && canDelete && partner
              ? () => setDeleteOpen(true)
              : undefined
          }
        />
      </FormDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={
          partner?.companyName || partner?.contactName || "this partner"
        }
        entityLabel="talent partner"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
