"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCompanySettingsAction } from "@/features/settings/actions";
import {
  companySettingsSchema,
  type CompanySettingsValues,
} from "@/features/settings/schemas/settings.schema";
import type { CompanySettings } from "@/features/settings/types";

interface CompanySettingsFormProps {
  initial: CompanySettings;
  canEdit: boolean;
}

export function CompanySettingsForm({
  initial,
  canEdit,
}: CompanySettingsFormProps) {
  const [pending, startTransition] = useTransition();
  const form = useForm<CompanySettingsValues>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      ...initial,
      logoUrl: initial.logoUrl ?? "",
      brandPrimaryColor: initial.brandPrimaryColor ?? "",
      brandSecondaryColor: initial.brandSecondaryColor ?? "",
      companyAddress: initial.companyAddress ?? "",
    },
  });

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await updateCompanySettingsAction(values);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success("Company settings saved");
        });
      })}
    >
      {!canEdit ? (
        <p className="rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs text-[#64748B]">
          Only Super Admin can edit company settings. You can view the current
          values.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="companyName">Company name</Label>
          <Input
            id="companyName"
            disabled={!canEdit || pending}
            {...form.register("companyName")}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input
            id="logoUrl"
            placeholder="https://"
            disabled={!canEdit || pending}
            {...form.register("logoUrl")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="primaryEmail">Primary email</Label>
          <Input
            id="primaryEmail"
            type="email"
            disabled={!canEdit || pending}
            {...form.register("primaryEmail")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="supportEmail">Support email</Label>
          <Input
            id="supportEmail"
            type="email"
            disabled={!canEdit || pending}
            {...form.register("supportEmail")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timeZone">Time zone</Label>
          <Input
            id="timeZone"
            disabled={!canEdit || pending}
            {...form.register("timeZone")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            disabled={!canEdit || pending}
            {...form.register("currency")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            disabled={!canEdit || pending}
            {...form.register("country")}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="companyAddress">Company address (future-ready)</Label>
          <Textarea
            id="companyAddress"
            rows={2}
            disabled={!canEdit || pending}
            {...form.register("companyAddress")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brandPrimaryColor">Brand primary (future-ready)</Label>
          <Input
            id="brandPrimaryColor"
            placeholder="#0F172A"
            disabled={!canEdit || pending}
            {...form.register("brandPrimaryColor")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brandSecondaryColor">
            Brand secondary (future-ready)
          </Label>
          <Input
            id="brandSecondaryColor"
            placeholder="#2563EB"
            disabled={!canEdit || pending}
            {...form.register("brandSecondaryColor")}
          />
        </div>
      </div>

      {canEdit ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save company settings"}
        </Button>
      ) : null}
    </form>
  );
}
