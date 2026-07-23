"use client";

import { useState } from "react";
import { toast } from "sonner";

import { FormDialog } from "@/components/shared/form-dialog";
import {
  createClientAction,
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
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function ClientDialog({
  open,
  mode,
  client,
  accountManagers,
  onOpenChange,
  onCompleted,
}: ClientDialogProps) {
  const [submitting, setSubmitting] = useState(false);

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

  return (
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
        submitting={submitting}
        submitLabel={mode === "create" ? "Create Client" : "Save Changes"}
        onCancel={() => onOpenChange(false)}
        onSubmit={handleSubmit}
      />
    </FormDialog>
  );
}
