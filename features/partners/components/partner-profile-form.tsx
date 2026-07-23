"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  stripSystemMarkers,
} from "@/lib/airtable/field-markers";
import { updateOwnPartnerProfileAction } from "@/features/partners/actions/partners.actions";
import {
  partnerSelfProfileSchema,
  type PartnerSelfProfileValues,
} from "@/features/partners/schemas/partner-self-profile.schema";
import {
  PARTNER_STATUS_LABELS,
  PARTNER_VERIFICATION_LABELS,
  type Partner,
} from "@/features/partners/types";

interface PartnerProfileFormProps {
  partner: Partner;
}

function toDefaults(partner: Partner): PartnerSelfProfileValues {
  return {
    companyName: partner.companyName,
    contactName: partner.contactName ?? "",
    email: partner.email ?? "",
    phone: partner.phone ?? "",
    specialization: partner.specialization ?? "",
    notes: stripSystemMarkers(partner.notes),
  };
}

export function PartnerProfileForm({ partner }: PartnerProfileFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PartnerSelfProfileValues>({
    resolver: zodResolver(
      partnerSelfProfileSchema,
    ) as Resolver<PartnerSelfProfileValues>,
    defaultValues: toDefaults(partner),
  });

  function onSubmit(values: PartnerSelfProfileValues) {
    startTransition(async () => {
      const result = await updateOwnPartnerProfileAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Profile updated");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
            Status
          </p>
          <p className="mt-1 text-sm font-medium text-[#0F172A]">
            {PARTNER_STATUS_LABELS[partner.status]}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
            Verification
          </p>
          <p className="mt-1 text-sm font-medium text-[#0F172A]">
            {PARTNER_VERIFICATION_LABELS[partner.verificationStatus]}
          </p>
        </div>
        {partner.partnerCode ? (
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
              Partner code
            </p>
            <p className="mt-1 text-sm font-medium text-[#0F172A]">
              {partner.partnerCode}
            </p>
          </div>
        ) : null}
      </div>

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

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} {...register("notes")} />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
