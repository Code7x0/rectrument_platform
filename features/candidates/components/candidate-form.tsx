"use client";

import { useRef, useState, type ReactNode } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { FilePreviewLink } from "@/components/shared/file-preview-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  candidateFormSchema,
  emptySkillScreen,
  type CandidateFormValues,
} from "@/features/candidates/schemas/candidate.schema";
import {
  RESUME_ACCEPT,
  validateResumeFileMeta,
} from "@/lib/files/document-types";

interface CandidateFormProps {
  defaultValues?: Partial<CandidateFormValues>;
  submitting?: boolean;
  resumeRequired?: boolean;
  currentResumeUrl?: string | null;
  currentResumeFilename?: string | null;
  /** Allow clearing the existing resume on edit (unreviewed partner flow). */
  allowRemoveResume?: boolean;
  onCancel?: () => void;
  onSubmit: (
    values: CandidateFormValues,
    resumeFile: File | null,
    options?: { removeResume?: boolean },
  ) => Promise<void> | void;
  submitLabel?: string;
  submittingLabel?: string;
  /** Optional content above the profile fields (e.g. job multi-select). */
  topSlot?: ReactNode;
}

export function CandidateForm({
  defaultValues,
  submitting = false,
  resumeRequired = true,
  currentResumeUrl = null,
  currentResumeFilename = null,
  allowRemoveResume = false,
  onCancel,
  onSubmit,
  submitLabel = "Submit Candidate",
  submittingLabel = "Uploading & submitting…",
  topSlot,
}: CandidateFormProps) {
  const resumeRef = useRef<HTMLInputElement>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [removeResume, setRemoveResume] = useState(false);
  const {
    register,
    control,
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
      remarks: "",
      skills: "",
      ...defaultValues,
      skillScreens:
        defaultValues?.skillScreens && defaultValues.skillScreens.length > 0
          ? defaultValues.skillScreens
          : [emptySkillScreen()],
    },
  });

  const skillFields = useFieldArray({ control, name: "skillScreens" });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={handleSubmit(async (values) => {
        const file = resumeRef.current?.files?.[0] ?? null;
        if (resumeRequired && !file && !(currentResumeUrl && !removeResume)) {
          toast.error("Resume is required");
          return;
        }
        if (file) {
          const metaError = validateResumeFileMeta({
            filename: file.name,
            contentType: file.type,
            size: file.size,
          });
          if (metaError) {
            toast.error(metaError);
            return;
          }
        }
        await onSubmit(values, file, {
          removeResume: !file && removeResume,
        });
      })}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {topSlot}
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
              <p className="text-xs text-destructive">
                {errors.fullName.message}
              </p>
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
              accept={RESUME_ACCEPT}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (!file) {
                  setResumeName(null);
                  return;
                }
                const metaError = validateResumeFileMeta({
                  filename: file.name,
                  contentType: file.type,
                  size: file.size,
                });
                if (metaError) {
                  toast.error(metaError);
                  event.target.value = "";
                  setResumeName(null);
                  return;
                }
                setRemoveResume(false);
                setResumeName(file.name);
              }}
            />
            {resumeName ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {currentResumeUrl && !removeResume
                    ? "Replacement ready: "
                    : "Selected: "}
                  <span className="font-medium text-foreground">{resumeName}</span>
                </span>
                <button
                  type="button"
                  className="font-medium text-[#2563EB] hover:underline"
                  disabled={submitting}
                  onClick={() => {
                    if (resumeRef.current) {
                      resumeRef.current.value = "";
                    }
                    setResumeName(null);
                  }}
                >
                  Clear selection
                </button>
              </div>
            ) : removeResume ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Resume will be removed when you save.</span>
                <button
                  type="button"
                  className="font-medium text-[#2563EB] hover:underline"
                  disabled={submitting}
                  onClick={() => setRemoveResume(false)}
                >
                  Undo
                </button>
              </div>
            ) : currentResumeUrl ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Current:{" "}
                  <FilePreviewLink
                    url={currentResumeUrl}
                    filename={currentResumeFilename}
                    title="Current resume"
                    className="font-medium text-[#2563EB] hover:underline"
                  >
                    {currentResumeFilename?.trim() || "Preview / download"}
                  </FilePreviewLink>
                </span>
                <span>Choose a file above to replace it.</span>
                {allowRemoveResume ? (
                  <button
                    type="button"
                    className="font-medium text-destructive hover:underline"
                    disabled={submitting}
                    onClick={() => {
                      if (resumeRef.current) {
                        resumeRef.current.value = "";
                      }
                      setResumeName(null);
                      setRemoveResume(true);
                    }}
                  >
                    Remove resume
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                PDF or Word · max 8MB
              </p>
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
              <p className="text-xs text-destructive">
                {errors.linkedIn.message}
              </p>
            ) : null}
          </div>
        </div>

        <section className="space-y-3 rounded-xl border border-[#DBEAFE] bg-[#F8FAFC] p-4">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">
              Screening Matrix (optional)
            </h3>
            <p className="mt-1 text-xs text-[#64748B]">
              Skills, years, alternate tech, and extra notes go here. Internal
              Feedback from Talent Socio stays separate.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Total experience</Label>
            <Input
              id="experience"
              placeholder="e.g. 6 years"
              disabled={submitting}
              {...register("experience")}
            />
            {errors.experience ? (
              <p className="text-xs text-destructive">
                {errors.experience.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            {skillFields.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3 sm:grid-cols-12"
              >
                <div className="space-y-1.5 sm:col-span-4">
                  <Label htmlFor={`skillScreens.${index}.skill`}>Skill</Label>
                  <Input
                    id={`skillScreens.${index}.skill`}
                    placeholder="e.g. React"
                    disabled={submitting}
                    {...register(`skillScreens.${index}.skill`)}
                  />
                  {errors.skillScreens?.[index]?.skill ? (
                    <p className="text-xs text-destructive">
                      {errors.skillScreens[index]?.skill?.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor={`skillScreens.${index}.years`}>
                    Years / exposure
                  </Label>
                  <Input
                    id={`skillScreens.${index}.years`}
                    placeholder="e.g. 4 years"
                    disabled={submitting}
                    {...register(`skillScreens.${index}.years`)}
                  />
                  {errors.skillScreens?.[index]?.years ? (
                    <p className="text-xs text-destructive">
                      {errors.skillScreens[index]?.years?.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5 sm:col-span-4">
                  <Label htmlFor={`skillScreens.${index}.alternate`}>
                    Alternate tech if not using
                  </Label>
                  <Input
                    id={`skillScreens.${index}.alternate`}
                    placeholder="e.g. Vue / Azure"
                    disabled={submitting}
                    {...register(`skillScreens.${index}.alternate`)}
                  />
                </div>
                <div className="flex items-end sm:col-span-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={submitting || skillFields.fields.length <= 1}
                    onClick={() => skillFields.remove(index)}
                    aria-label="Remove skill"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {errors.skillScreens?.root ? (
              <p className="text-xs text-destructive">
                {errors.skillScreens.root.message}
              </p>
            ) : errors.skillScreens?.message ? (
              <p className="text-xs text-destructive">
                {errors.skillScreens.message}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => skillFields.append(emptySkillScreen())}
            >
              <Plus className="h-3.5 w-3.5" />
              Add skill
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Other screening notes (optional)</Label>
            <Textarea
              id="remarks"
              rows={3}
              placeholder="Relocation, notice constraints, why job change, gaps…"
              disabled={submitting}
              {...register("remarks")}
            />
          </div>
        </section>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-card px-6 py-4">
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
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
