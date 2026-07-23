"use client";

import { useState } from "react";
import { toast } from "sonner";

import { DeleteDialog } from "@/components/shared/delete-dialog";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  createClientAction,
  deleteClientAction,
  updateClientAction,
} from "@/features/clients/actions/clients.actions";
import { ClientForm } from "@/features/clients/components/client-form";
import type { ClientFormValues } from "@/features/clients/schemas/client.schema";
import type { Client } from "@/features/clients/types";
import type { LookupOption } from "@/services/lookups";

interface ClientDialogProps {
  open: boolean;
  mode: "create" | "edit";
  client?: Client | null;
  accountManagers: LookupOption[];
  canDelete?: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function ClientDialog({
  open,
  mode,
  client,
  accountManagers,
  canDelete = false,
  onOpenChange,
  onCompleted,
}: ClientDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(values: ClientFormValues) {
    setSubmitting(true);
    try {
      const result =
        mode === "create"
          ? await createClientAction(values)
          : await updateClientAction(client!.id, values);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(mode === "create" ? "Client created" : "Client updated");
      onOpenChange(false);
      onCompleted();
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!client) {
      return;
    }
    setDeleting(true);
    try {
      const result = await deleteClientAction(client.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Client deleted from Airtable");
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
        title={mode === "create" ? "Create Client" : "Edit Client"}
        description={
          mode === "create"
            ? "Add a hiring company to the platform."
            : "Update client details."
        }
      >
        <ClientForm
          key={client?.id ?? "create"}
          accountManagers={accountManagers}
          initialClient={mode === "edit" ? client : null}
          submitting={submitting || deleting}
          submitLabel={mode === "create" ? "Create Client" : "Save Changes"}
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
          onDelete={
            mode === "edit" && canDelete && client
              ? () => setDeleteOpen(true)
              : undefined
          }
        />
      </FormDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={client?.name ?? "this client"}
        entityLabel="client"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
