"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { updateNotificationPlatformSettingsAction } from "@/features/settings/actions";
import {
  notificationPlatformSettingsSchema,
  type NotificationPlatformSettingsValues,
} from "@/features/settings/schemas/settings.schema";
import type { NotificationPlatformSettings } from "@/features/settings/types";
import {
  ALL_NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CHANNEL_LABELS,
} from "@/features/notifications/types";

interface NotificationPlatformSettingsFormProps {
  initial: NotificationPlatformSettings;
  canEdit: boolean;
}

export function NotificationPlatformSettingsForm({
  initial,
  canEdit,
}: NotificationPlatformSettingsFormProps) {
  const [pending, startTransition] = useTransition();
  const form = useForm<NotificationPlatformSettingsValues>({
    resolver: zodResolver(notificationPlatformSettingsSchema),
    defaultValues: initial,
  });

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await updateNotificationPlatformSettingsAction(values);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success("Notification defaults saved");
        });
      })}
    >
      <p className="text-sm text-[#64748B]">
        Platform defaults for new preference records. Per-user preferences at{" "}
        <span className="font-medium">/notifications/preferences</span> are not
        replaced.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="defaultEmailEnabled">Default email behaviour</Label>
          <Select
            id="defaultEmailEnabled"
            disabled={!canEdit || pending}
            value={form.watch("defaultEmailEnabled") ? "yes" : "no"}
            onChange={(e) =>
              form.setValue("defaultEmailEnabled", e.target.value === "yes")
            }
          >
            <option value="yes">Email enabled by default</option>
            <option value="no">Email disabled by default</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="defaultChannel">Default channel</Label>
          <Select
            id="defaultChannel"
            disabled={!canEdit || pending}
            {...form.register("defaultChannel")}
          >
            {Object.entries(NOTIFICATION_CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Category defaults
        </h3>
        {ALL_NOTIFICATION_CATEGORIES.map((category) => (
          <div
            key={category}
            className="grid gap-2 sm:grid-cols-[1fr_12rem] sm:items-center"
          >
            <Label htmlFor={`cat-${category}`}>
              {NOTIFICATION_CATEGORY_LABELS[category]}
            </Label>
            <Select
              id={`cat-${category}`}
              disabled={!canEdit || pending}
              value={form.watch(`categoryDefaults.${category}`)}
              onChange={(e) =>
                form.setValue(
                  `categoryDefaults.${category}`,
                  e.target.value as NotificationPlatformSettingsValues["defaultChannel"],
                )
              }
            >
              {Object.entries(NOTIFICATION_CHANNEL_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </Select>
          </div>
        ))}
      </div>

      {canEdit ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save notification defaults"}
        </Button>
      ) : null}
    </form>
  );
}
