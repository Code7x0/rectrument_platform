"use client";

import { useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema) as Resolver<CandidateFormValues>,
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      currentCompany: "",
      currentLocation: "",
      experience: "",
      currentCtc: "",
      expectedCtc: "",
      noticePeriod: "",
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
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" {...register("fullName")} />
          {errors.fullName ? (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          ) : null}
        </div>

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
          {errors.phone ? (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="candidate-resume-input">
            Resume{resumeRequired ? "" : " (optional)"}
          </Label>
          <Input
            id="candidate-resume-input"
            ref={resumeRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentCompany">Current Company</Label>
          <Input id="currentCompany" {...register("currentCompany")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentLocation">Current Location</Label>
          <Input id="currentLocation" {...register("currentLocation")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="experience">Experience</Label>
          <Input id="experience" {...register("experience")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="noticePeriod">Notice Period</Label>
          <Input id="noticePeriod" {...register("noticePeriod")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentCtc">Current CTC</Label>
          <Input id="currentCtc" {...register("currentCtc")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedCtc">Expected CTC</Label>
          <Input id="expectedCtc" {...register("expectedCtc")} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="skills">Skills</Label>
          <Input
            id="skills"
            placeholder="Comma-separated"
            {...register("skills")}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea id="remarks" rows={3} {...register("remarks")} />
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
          {submitting ? "Submitting…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
