"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  partnerFormSchema,
  type PartnerFormValues,
} from "@/features/partners/schemas/partner.schema";
import type { Partner } from "@/features/partners/types";

interface PartnerFormProps {
  initialPartner?: Partner | null;
  submitting?: boolean;
  onSubmit: (values: PartnerFormValues) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

function toDefaults(partner?: Partner | null): PartnerFormValues {
  if (!partner) {
    return {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      specialization: "",
      revenueShare: "",
      rating: undefined,
      status: "pending",
      verificationStatus: "pending",
      notes: "",
    };
  }

  return {
    companyName: partner.companyName,
    contactName: partner.contactName ?? "",
    email: partner.email ?? "",
    phone: partner.phone ?? "",
    specialization: partner.specialization ?? "",
    revenueShare: partner.revenueShare ?? "",
    rating: partner.rating ?? undefined,
    status: partner.status === "archived" ? "pending" : partner.status,
    verificationStatus: partner.verificationStatus,
    notes: partner.notes ?? "",
  };
}

export function PartnerForm({
  initialPartner,
  submitting = false,
  onSubmit,
  onCancel,
  submitLabel = "Save Partner",
}: PartnerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerFormSchema) as Resolver<PartnerFormValues>,
    defaultValues: toDefaults(initialPartner),
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="companyName">Company Name</Label>
        <Input id="companyName" {...register("companyName")} />
        {errors.companyName ? (
          <p className="text-xs text-destructive">
            {errors.companyName.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Person</Label>
          <Input id="contactName" {...register("contactName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="specialization">Specialization</Label>
          <Input id="specialization" {...register("specialization")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="revenueShare">Revenue Share</Label>
          <Input
            id="revenueShare"
            placeholder="e.g. 20%"
            {...register("revenueShare")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rating">Rating (0–5)</Label>
          <Input
            id="rating"
            type="number"
            min={0}
            max={5}
            step={0.1}
            {...register("rating")}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...register("status")}>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="verificationStatus">Verification Status</Label>
          <Select id="verificationStatus" {...register("verificationStatus")}>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
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
    </form>
  );
}
