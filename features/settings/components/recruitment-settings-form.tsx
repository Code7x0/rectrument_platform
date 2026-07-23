"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateRecruitmentSettingsAction } from "@/features/settings/actions";
import {
  recruitmentSettingsSchema,
  type RecruitmentSettingsValues,
} from "@/features/settings/schemas/settings.schema";
import type { RecruitmentSettings } from "@/features/settings/types";
import { SUBMISSION_STATUS_LABELS } from "@/features/shared/entities";

interface RecruitmentSettingsFormProps {
  initial: RecruitmentSettings;
  canEdit: boolean;
}

export function RecruitmentSettingsForm({
  initial,
  canEdit,
}: RecruitmentSettingsFormProps) {
  const [pending, startTransition] = useTransition();
  const form = useForm<RecruitmentSettingsValues>({
    resolver: zodResolver(recruitmentSettingsSchema),
    defaultValues: {
      ...initial,
      interviewStageLabels: initial.interviewStageLabels,
    },
  });

  const stagesText = form.watch("interviewStageLabels")?.join("\n") ?? "";

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await updateRecruitmentSettingsAction(values);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success("Recruitment settings saved");
        });
      })}
    >
      <p className="text-sm text-[#64748B]">
        These are configurable defaults for operators. Workflow transition rules
        are not changed here.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="defaultCandidateStatus">Default candidate status</Label>
          <Select
            id="defaultCandidateStatus"
            disabled={!canEdit || pending}
            {...form.register("defaultCandidateStatus")}
          >
            {Object.entries(SUBMISSION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="defaultExpectedProfiles">
            Default expected profiles (allocation)
          </Label>
          <Input
            id="defaultExpectedProfiles"
            type="number"
            min={1}
            max={100}
            disabled={!canEdit || pending}
            {...form.register("defaultExpectedProfiles", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="interviewStageLabels">
            Interview stage labels (one per line)
          </Label>
          <Textarea
            id="interviewStageLabels"
            rows={4}
            disabled={!canEdit || pending}
            value={stagesText}
            onChange={(e) =>
              form.setValue(
                "interviewStageLabels",
                e.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean),
                { shouldValidate: true },
              )
            }
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Required documents</Label>
          <div className="flex flex-wrap gap-4 text-sm">
            {(["pan", "aadhaar", "agreement"] as const).map((doc) => {
              const checked = form.watch("requiredDocuments")?.includes(doc);
              return (
                <label key={doc} className="flex items-center gap-2 capitalize">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#CBD5E1]"
                    disabled={!canEdit || pending}
                    checked={checked}
                    onChange={(e) => {
                      const current = form.getValues("requiredDocuments") ?? [];
                      form.setValue(
                        "requiredDocuments",
                        e.target.checked
                          ? [...current, doc]
                          : current.filter((item) => item !== doc),
                        { shouldValidate: true },
                      );
                    }}
                  />
                  {doc}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {canEdit ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save recruitment settings"}
        </Button>
      ) : null}
    </form>
  );
}
