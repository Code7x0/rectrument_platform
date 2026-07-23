"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  clientFormSchema,
  type ClientFormValues,
} from "@/features/clients/schemas/client.schema";
import type { Client } from "@/features/clients/types";
import type { LookupOption } from "@/services/lookups";

interface ClientFormProps {
  accountManagers: LookupOption[];
  initialClient?: Client | null;
  submitting?: boolean;
  onSubmit: (values: ClientFormValues) => Promise<void> | void;
  onCancel?: () => void;
  onDelete?: () => void;
  submitLabel?: string;
}

function toDefaults(client?: Client | null): ClientFormValues {
  if (!client) {
    return {
      name: "",
      industry: "",
      website: "",
      primaryContact: "",
      accountManagerId: "",
      status: "active",
      notes: "",
    };
  }

  return {
    name: client.name,
    industry: client.industry ?? "",
    website: client.website ?? "",
    primaryContact: client.primaryContact ?? "",
    accountManagerId: client.accountManagerId ?? "",
    status: client.status === "archived" ? "active" : client.status,
    notes: client.notes ?? "",
  };
}

export function ClientForm({
  accountManagers,
  initialClient,
  submitting = false,
  onSubmit,
  onCancel,
  onDelete,
  submitLabel = "Save Client",
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema) as Resolver<ClientFormValues>,
    defaultValues: toDefaults(initialClient),
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="name">Client Name</Label>
        <Input id="name" {...register("name")} />
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" {...register("industry")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="primaryContact">Primary Contact</Label>
          <Input id="primaryContact" {...register("primaryContact")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input id="website" placeholder="https://" {...register("website")} />
        {errors.website ? (
          <p className="text-xs text-destructive">{errors.website.message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="accountManagerId">Account Manager</Label>
          <Select id="accountManagerId" {...register("accountManagerId")}>
            <option value="">Unassigned</option>
            {accountManagers.map((am) => (
              <option key={am.id} value={am.id}>
                {am.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...register("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        {onDelete ? (
          <Button
            type="button"
            variant="destructive"
            disabled={submitting}
            onClick={onDelete}
          >
            Delete Client
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
