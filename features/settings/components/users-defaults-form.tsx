"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { updateUsersDefaultsAction } from "@/features/settings/actions";
import {
  usersDefaultsSchema,
  type UsersDefaultsValues,
} from "@/features/settings/schemas/settings.schema";
import type {
  UserCountsSummary,
  UsersDefaultsSettings,
} from "@/features/settings/types";

interface UsersDefaultsFormProps {
  initial: UsersDefaultsSettings;
  counts: UserCountsSummary;
  canEdit: boolean;
  canEnableAutoApprove: boolean;
  roleManagementHref: string | null;
}

export function UsersDefaultsForm({
  initial,
  counts,
  canEdit,
  canEnableAutoApprove,
  roleManagementHref,
}: UsersDefaultsFormProps) {
  const [pending, startTransition] = useTransition();
  const form = useForm<UsersDefaultsValues>({
    resolver: zodResolver(usersDefaultsSchema),
    defaultValues: initial,
  });

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="text-xs uppercase tracking-wide text-[#64748B]">Active</p>
          <p className="mt-1 text-2xl font-semibold text-[#0F172A]">
            {counts.active}
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="text-xs uppercase tracking-wide text-[#64748B]">
            Inactive
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#0F172A]">
            {counts.inactive}
          </p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="text-xs uppercase tracking-wide text-[#64748B]">Total</p>
          <p className="mt-1 text-2xl font-semibold text-[#0F172A]">
            {counts.total}
          </p>
        </div>
      </div>

      {roleManagementHref ? (
        <p className="text-sm text-[#475569]">
          Role promote / demote / invite lives in{" "}
          <Link
            href={roleManagementHref}
            className="font-medium text-[#2563EB] hover:underline"
          >
            Role Management
          </Link>
          . This page configures defaults only.
        </p>
      ) : (
        <p className="text-sm text-[#475569]">
          This page configures registration and invitation defaults only.
        </p>
      )}

      <form
        className="space-y-5"
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await updateUsersDefaultsAction(values);
            if (!result.success) {
              toast.error(result.message);
              return;
            }
            toast.success("User defaults saved");
          });
        })}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="defaultPartnerRegistrationBehaviour">
              Partner registration behaviour
            </Label>
            <Select
              id="defaultPartnerRegistrationBehaviour"
              disabled={!canEdit || pending}
              {...form.register("defaultPartnerRegistrationBehaviour")}
            >
              <option value="manual_approval">Manual approval (required)</option>
              <option value="auto_approve" disabled={!canEnableAutoApprove}>
                Auto-approve (Super Admin only — not wired to workflow yet)
              </option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="defaultIdentityVisibility">
              Default identity visibility
            </Label>
            <Select
              id="defaultIdentityVisibility"
              disabled={!canEdit || pending}
              {...form.register("defaultIdentityVisibility")}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invitationExpiryDays">Invitation expiry (days)</Label>
            <Input
              id="invitationExpiryDays"
              type="number"
              min={1}
              max={90}
              disabled={!canEdit || pending}
              {...form.register("invitationExpiryDays", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="requireActivationEmail">Activation email</Label>
            <Select
              id="requireActivationEmail"
              disabled={!canEdit || pending}
              value={form.watch("requireActivationEmail") ? "yes" : "no"}
              onChange={(e) =>
                form.setValue("requireActivationEmail", e.target.value === "yes")
              }
            >
              <option value="yes">Required</option>
              <option value="no">Optional (display only)</option>
            </Select>
          </div>
        </div>

        {canEdit ? (
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save user defaults"}
          </Button>
        ) : null}
      </form>
    </div>
  );
}
