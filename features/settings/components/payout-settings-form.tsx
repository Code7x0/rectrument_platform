"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { updatePayoutSettingsAction } from "@/features/settings/actions";
import {
  payoutSettingsSchema,
  type PayoutSettingsValues,
} from "@/features/settings/schemas/settings.schema";
import type { PayoutDisplaySettings } from "@/features/settings/types";

interface PayoutSettingsFormProps {
  initial: PayoutDisplaySettings;
  canEdit: boolean;
}

export function PayoutSettingsForm({
  initial,
  canEdit,
}: PayoutSettingsFormProps) {
  const [pending, startTransition] = useTransition();
  const form = useForm<PayoutSettingsValues>({
    resolver: zodResolver(payoutSettingsSchema),
    defaultValues: initial,
  });

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await updatePayoutSettingsAction(values);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success("Payout display settings saved");
        });
      })}
    >
      <p className="text-sm text-[#64748B]">
        Display preferences only. Payout eligibility and calculation rules are
        unchanged.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="defaultCurrency">Default currency</Label>
          <Input
            id="defaultCurrency"
            disabled={!canEdit || pending}
            {...form.register("defaultCurrency")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="decimalPrecision">Decimal precision</Label>
          <Input
            id="decimalPrecision"
            type="number"
            min={0}
            max={4}
            disabled={!canEdit || pending}
            {...form.register("decimalPrecision", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dateFormat">Date format</Label>
          <Select
            id="dateFormat"
            disabled={!canEdit || pending}
            {...form.register("dateFormat")}
          >
            <option value="MMM d, yyyy">MMM d, yyyy</option>
            <option value="dd/MM/yyyy">dd/MM/yyyy</option>
            <option value="yyyy-MM-dd">yyyy-MM-dd</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="showPercentage">Percentage display</Label>
          <Select
            id="showPercentage"
            disabled={!canEdit || pending}
            value={form.watch("showPercentage") ? "yes" : "no"}
            onChange={(e) =>
              form.setValue("showPercentage", e.target.value === "yes")
            }
          >
            <option value="yes">Show percentage</option>
            <option value="no">Hide percentage</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="taxEnabled">Tax settings (future-ready)</Label>
          <Select
            id="taxEnabled"
            disabled
            value={form.watch("taxEnabled") ? "yes" : "no"}
          >
            <option value="no">Disabled</option>
            <option value="yes">Enabled</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="commissionRulesEnabled">
            Commission rules (future-ready)
          </Label>
          <Select
            id="commissionRulesEnabled"
            disabled
            value={form.watch("commissionRulesEnabled") ? "yes" : "no"}
          >
            <option value="no">Disabled</option>
            <option value="yes">Enabled</option>
          </Select>
        </div>
      </div>

      {canEdit ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save payout settings"}
        </Button>
      ) : null}
    </form>
  );
}
