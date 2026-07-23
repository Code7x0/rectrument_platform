"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  allocatePartnerFormSchema,
  type AllocatePartnerFormValues,
} from "@/features/allocations/schemas/allocation.schema";
import type { LookupOption } from "@/services/lookups";

interface AllocatePartnerFormProps {
  jobId: string;
  jobLabel: string;
  partners: LookupOption[];
  submitting?: boolean;
  onSubmit: (values: AllocatePartnerFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AllocatePartnerForm({
  jobId,
  jobLabel,
  partners,
  submitting = false,
  onSubmit,
  onCancel,
}: AllocatePartnerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AllocatePartnerFormValues>({
    resolver: zodResolver(
      allocatePartnerFormSchema,
    ) as Resolver<AllocatePartnerFormValues>,
    defaultValues: {
      jobId,
      partnerId: "",
      expectedProfiles: 1,
      assignedDate: todayIsoDate(),
      notes: "",
      status: "assigned",
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("jobId")} />

      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
          Job
        </p>
        <p className="mt-1 text-sm font-medium text-[#0F172A]">{jobLabel}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="partnerId">Talent Partner ID</Label>
        <Select id="partnerId" {...register("partnerId")}>
          <option value="">Select talent partner</option>
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.label}
            </option>
          ))}
        </Select>
        {errors.partnerId ? (
          <p className="text-xs text-destructive">
            {errors.partnerId.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expectedProfiles">Expected Profiles</Label>
          <Input
            id="expectedProfiles"
            type="number"
            min={1}
            {...register("expectedProfiles")}
          />
          {errors.expectedProfiles ? (
            <p className="text-xs text-destructive">
              {errors.expectedProfiles.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignedDate">Assigned Date</Label>
          <Input
            id="assignedDate"
            type="date"
            {...register("assignedDate")}
          />
          {errors.assignedDate ? (
            <p className="text-xs text-destructive">
              {errors.assignedDate.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select id="status" {...register("status")}>
          <option value="assigned">Assigned</option>
          <option value="working">Working</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        {errors.status ? (
          <p className="text-xs text-destructive">{errors.status.message}</p>
        ) : null}
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
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Assigning…" : "Assign"}
        </Button>
      </div>
    </form>
  );
}
