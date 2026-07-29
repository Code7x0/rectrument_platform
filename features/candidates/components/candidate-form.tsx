"use client";

import { useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  candidateFormSchema,
  type CandidateFormValues,
} from "@/features/candidates/schemas/candidate.schema";

interface CandidateFormProps {
  defaultValues?: Partial<CandidateFormValues>;
  submitting?: boolean;
  resumeRequired?: boolean;
  onCancel?: () => void;
  onSubmit: (
    values: CandidateFormValues,
    resumeFile: File | null,
  ) => Promise<void> | void;
  submitLabel?: string;
}

export function CandidateForm({
  defaultValues,
  submitting = false,
  resumeRequired = true,
  onCancel,
  onSubmit,
  submitLabel = "Submit Candidate",
}: CandidateFormProps) {
  const resumeRef = useRef<HTMLInputElement>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema) as Resolver<CandidateFormValues>,
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      currentLocation: "",
      currentCtc: "",
      expectedCtc: "",
      noticePeriod: "",
      linkedIn: "",
      currentCompany: "",
      experience: "",
      skills: "",
      remarks: "",
      ...defaultValues,
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        const file = resumeRef.current?.files?.[0] ?? null;
        if (resumeRequired && !file) {
          toast.error("Resume is required");
          return;
        }
        await onSubmit(values, file);
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fullName">Candidate Name *</Label>
          <Input
            id="fullName"
            autoComplete="name"
            disabled={submitting}
            {...register("fullName")}
          />
          {errors.fullName ? (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            disabled={submitting}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            autoComplete="tel"
            disabled={submitting}
            {...register("phone")}
          />
          {errors.phone ? (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="candidate-resume-input">
            Resume{resumeRequired ? " *" : " (optional)"}
          </Label>
          <Input
            id="candidate-resume-input"
            ref={resumeRef}
            type="file"
            disabled={submitting}
            accept=".pdf,.doc,.docx,application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (file && file.size > 8 * 1024 * 1024) {
                toast.error("Resume must be 8MB or smaller");
                event.target.value = "";
                setResumeName(null);
                return;
              }
              const name = (file?.name ?? "").toLowerCase();
              if (
                file &&
                !(
                  name.endsWith(".pdf") ||
                  name.endsWith(".doc") ||
                  name.endsWith(".docx")
                )
              ) {
                toast.error("Resume must be a PDF or Word file");
                event.target.value = "";
                setResumeName(null);
                return;
              }
              setResumeName(file?.name ?? null);
            }}
          />
          {resumeName ? (
            <p className="text-xs text-[#64748B]">Selected: {resumeName}</p>
          ) : (
            <p className="text-xs text-[#64748B]">PDF or Word · max 8MB</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentLocation">Current Location *</Label>
          <Input
            id="currentLocation"
            disabled={submitting}
            {...register("currentLocation")}
          />
          {errors.currentLocation ? (
            <p className="text-xs text-destructive">
              {errors.currentLocation.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="noticePeriod">Notice Period *</Label>
          <Input
            id="noticePeriod"
            placeholder="e.g. 30 days / Immediate"
            disabled={submitting}
            {...register("noticePeriod")}
          />
          {errors.noticePeriod ? (
            <p className="text-xs text-destructive">
              {errors.noticePeriod.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentCtc">Current CTC</Label>
          <Input
            id="currentCtc"
            placeholder="Optional"
            disabled={submitting}
            {...register("currentCtc")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedCtc">Expected CTC</Label>
          <Input
            id="expectedCtc"
            placeholder="Optional"
            disabled={submitting}
            {...register("expectedCtc")}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="linkedIn">LinkedIn Profile (optional)</Label>
          <Input
            id="linkedIn"
            type="url"
            placeholder="https://linkedin.com/in/…"
            disabled={submitting}
            {...register("linkedIn")}
          />
          {errors.linkedIn ? (
            <p className="text-xs text-destructive">{errors.linkedIn.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Uploading & submitting…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
