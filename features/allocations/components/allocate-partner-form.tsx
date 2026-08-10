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
    watch,
    setValue,
    formState: { errors },
  } = useForm<AllocatePartnerFormValues>({
    resolver: zodResolver(
      allocatePartnerFormSchema,
    ) as Resolver<AllocatePartnerFormValues>,
    defaultValues: {
      jobId,
      partnerIds: [],
      expectedProfiles: 1,
      assignedDate: todayIsoDate(),
      notes: "",
      status: "assigned",
    },
  });

  const selectedPartnerIds = watch("partnerIds") ?? [];

  function togglePartner(partnerId: string, checked: boolean) {
    const next = checked
      ? [...new Set([...selectedPartnerIds, partnerId])]
      : selectedPartnerIds.filter((id) => id !== partnerId);
    setValue("partnerIds", next, { shouldValidate: true, shouldDirty: true });
  }

  const selectedCount = selectedPartnerIds.length;

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
        <Label>Talent Partners</Label>
        <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[#E2E8F0] p-3">
          {partners.length === 0 ? (
            <p className="text-xs text-[#64748B]">No talent partners available</p>
          ) : (
            partners.map((partner) => {
              const checked = selectedPartnerIds.includes(partner.id);
              return (
                <label
                  key={partner.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-[#0F172A]"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#CBD5E1]"
                    checked={checked}
                    disabled={submitting}
                    onChange={(event) =>
                      togglePartner(partner.id, event.target.checked)
                    }
                  />
                  <span>{partner.label}</span>
                </label>
              );
            })
          )}
        </div>
        {errors.partnerIds ? (
          <p className="text-xs text-destructive">
            {errors.partnerIds.message}
          </p>
        ) : (
          <p className="text-xs text-[#64748B]">
            {selectedCount === 0
              ? "Select one or more talent partners to assign in one go."
              : `${selectedCount} partner${selectedCount === 1 ? "" : "s"} selected`}
          </p>
        )}
      </div>

      <input type="hidden" {...register("expectedProfiles")} />

      <div className="grid gap-4 sm:grid-cols-2">
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
        <Button type="submit" disabled={submitting || selectedCount === 0}>
          {submitting
            ? "Assigning…"
            : selectedCount > 1
              ? `Assign ${selectedCount} Partners`
              : "Assign"}
        </Button>
      </div>
    </form>
  );
}
