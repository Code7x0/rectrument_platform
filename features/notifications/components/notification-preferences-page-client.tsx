"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ContentContainer } from "@/components/shared/content-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { updateNotificationPreferencesAction } from "@/features/notifications/actions";
import type {
  NotificationChannel,
  NotificationPreferences,
} from "@/features/notifications/types";
import {
  ALL_NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CHANNEL_LABELS,
} from "@/features/notifications/types";

interface NotificationPreferencesPageClientProps {
  preferences: NotificationPreferences;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function NotificationPreferencesPageClient({
  preferences,
  breadcrumbs,
}: NotificationPreferencesPageClientProps) {
  const [defaultChannel, setDefaultChannel] = useState(
    preferences.defaultChannel,
  );
  const [categories, setCategories] = useState(preferences.categories);
  const [pending, startTransition] = useTransition();

  return (
    <ContentContainer>
      <Breadcrumb items={breadcrumbs} />
      <PageHeader
        title="Notification preferences"
        description="Choose how you receive Jobs, Candidates, Payouts, Documents, and system alerts."
      />

      <form
        className="max-w-2xl space-y-6 rounded-2xl border border-[#E2E8F0] bg-white p-6"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await updateNotificationPreferencesAction({
              defaultChannel,
              categories,
            });
            if (!result.success) {
              toast.error(result.message);
              return;
            }
            toast.success("Preferences saved");
          });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="defaultChannel">Default channel</Label>
          <Select
            id="defaultChannel"
            value={defaultChannel}
            onChange={(e) =>
              setDefaultChannel(e.target.value as NotificationChannel)
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
          <p className="text-xs text-[#94A3B8]">
            Used when a category does not override the channel.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#0F172A]">Categories</h2>
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
                value={categories[category]}
                onChange={(e) =>
                  setCategories((current) => ({
                    ...current,
                    [category]: e.target.value as NotificationChannel,
                  }))
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

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </form>
    </ContentContainer>
  );
}
