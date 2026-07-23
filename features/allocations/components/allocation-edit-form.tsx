"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  updateAllocationFormSchema,
  type UpdateAllocationFormValues,
} from "@/features/allocations/schemas/allocation.schema";
import type { Allocation } from "@/features/allocations/types";

interface AllocationEditFormProps {
  allocation: Allocation;
  submitting?: boolean;
  onSubmit: (values: UpdateAllocationFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

function toFormValues(allocation: Allocation): UpdateAllocationFormValues {
  return {
    expectedProfiles: allocation.expectedProfiles || 1,
    assignedDate:
      allocation.assignedDate ?? new Date().toISOString().slice(0, 10),
    notes: allocation.notes ?? "",
    status: allocation.status === "archived" ? "assigned" : allocation.status,
  };
}

export function AllocationEditForm({
  allocation,
  submitting = false,
  onSubmit,
  onCancel,
}: AllocationEditFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateAllocationFormValues>({
    resolver: zodResolver(
      updateAllocationFormSchema,
    ) as Resolver<UpdateAllocationFormValues>,
    defaultValues: toFormValues(allocation),
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A]">
        <p>
          <span className="text-[#64748B]">Job:</span>{" "}
          {allocation.jobCode ?? "—"} — {allocation.jobTitle ?? "—"}
        </p>
        <p className="mt-1">
          <span className="text-[#64748B]">Partner:</span>{" "}
          {allocation.partnerName ?? allocation.partnerCode ?? "—"}
        </p>
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
          <Input id="assignedDate" type="date" {...register("assignedDate")} />
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
          {submitting ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
